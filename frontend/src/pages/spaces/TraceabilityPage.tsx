import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import { downloadFile } from '../../services/download';

interface WorkItem {
  id: string;
  key: string;
  title: string;
  status: string;
}

interface TraceLink {
  id: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  linkType: string;
  isSuspect: boolean;
}

interface Coverage {
  total: number;
  covered: number;
  percent: number;
  uncovered: string[];
}

export default function TraceabilityPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);

  const { data: matrix, isLoading } = useQuery({
    queryKey: ['trace', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/trace`);
      return res.data as { requirements: WorkItem[]; tests: WorkItem[]; links: TraceLink[] };
    },
  });

  const { data: coverage } = useQuery({
    queryKey: ['coverage', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/trace/coverage`);
      return res.data as Coverage;
    },
  });

  const { data: suspects } = useQuery({
    queryKey: ['suspects', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/trace/suspect`);
      return res.data as TraceLink[];
    },
  });

  const resolveSuspect = useMutation({
    mutationFn: async (linkId: string) => {
      await apiClient.post(`/api/spaces/${spaceKey}/trace/suspect/${linkId}/resolve`, {
        resolution: '검토 완료',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suspects', spaceKey] });
      queryClient.invalidateQueries({ queryKey: ['trace', spaceKey] });
      toast.success('의심 링크를 해소했습니다.');
    },
    onError: () => toast.error('처리하지 못했습니다.'),
  });

  const linkSet = useMemo(() => {
    const set = new Set<string>();
    for (const link of matrix?.links ?? []) set.add(`${link.fromId}:${link.toId}`);
    return set;
  }, [matrix]);

  const itemById = useMemo(() => {
    const map = new Map<string, WorkItem>();
    for (const item of [...(matrix?.requirements ?? []), ...(matrix?.tests ?? [])]) {
      map.set(item.id, item);
    }
    return map;
  }, [matrix]);

  const requirements = matrix?.requirements ?? [];
  const tests = matrix?.tests ?? [];

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadFile(
        `/api/export/spaces/${spaceKey}/traceability/excel`,
        `${spaceKey}-traceability.xlsx`,
      );
      toast.success('추적성 매트릭스를 내보냈습니다.');
    } catch {
      toast.error('내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  const percent = coverage?.percent ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">추적성 매트릭스</h1>
          <p className="text-sm text-gray-500 mt-1">
            요구사항 ↔ 테스트 케이스 양방향 연결과 의심 링크를 관리합니다.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? '내보내는 중…' : 'Excel 내보내기'}
        </button>
      </div>

      {coverage && (
        <section className="bg-white rounded-lg shadow p-6" aria-labelledby="coverage-heading">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <h2 id="coverage-heading" className="text-sm font-medium text-gray-500">
                요구사항 커버리지
              </h2>
              <p className="text-3xl font-bold text-green-600">{percent.toFixed(1)}%</p>
            </div>
            <div className="flex-1 min-w-[12rem]">
              <progress value={percent} max={100} aria-label={`요구사항 커버리지 ${percent.toFixed(1)}%`}>
                {percent.toFixed(1)}%
              </progress>
              <p className="text-sm text-gray-600 mt-1">
                커버됨 <b>{coverage.covered}</b> / 전체 <b>{coverage.total}</b>
              </p>
            </div>
            {coverage.uncovered.length > 0 && (
              <p className="text-sm text-red-600">
                미커버: {coverage.uncovered.join(', ')}
              </p>
            )}
          </div>
        </section>
      )}

      {suspects && suspects.length > 0 && (
        <section
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
          aria-labelledby="suspect-heading"
        >
          <h2 id="suspect-heading" className="text-sm font-bold text-yellow-900 mb-2">
            ⚠ 의심 링크(Suspect) {suspects.length}건
          </h2>
          <p className="text-sm text-yellow-800 mb-3">
            연결된 항목이 변경되었습니다. 내용을 검토한 뒤 해소해 주세요.
          </p>
          <ul className="flex flex-col gap-2" style={{ listStyle: 'none', padding: 0 }}>
            {suspects.map((link) => {
              const from = itemById.get(link.fromId);
              const to = itemById.get(link.toId);
              return (
                <li key={link.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs">{from?.key ?? link.fromId.slice(0, 8)}</span>
                  <span className="text-gray-500">—{link.linkType}→</span>
                  <span className="font-mono text-xs">{to?.key ?? link.toId.slice(0, 8)}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={resolveSuspect.isPending}
                    onClick={() => resolveSuspect.mutate(link.id)}
                  >
                    해소
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div
        role="region"
        aria-label="요구사항-테스트 추적성 매트릭스"
        tabIndex={0}
        className="table-wrapper"
      >
        <table className="jir-table">
          <caption className="visually-hidden">
            요구사항과 테스트 케이스의 연결 매트릭스. ✓는 연결됨을 의미합니다.
          </caption>
          <thead>
            <tr>
              <th scope="col">요구사항 \ 테스트</th>
              {tests.map((test) => (
                <th key={test.id} scope="col" className="whitespace-nowrap">
                  <span className="font-mono text-xs">{test.key}</span>
                  <span className="visually-hidden">{test.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={tests.length + 1} className="text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : requirements.length === 0 ? (
              <tr>
                <td colSpan={tests.length + 1} className="text-center text-gray-500">
                  요구사항이 없습니다. 요구사항 작업 항목을 먼저 등록하세요.
                </td>
              </tr>
            ) : tests.length === 0 ? (
              <tr>
                <td colSpan={1} className="text-center text-gray-500">
                  테스트 케이스가 없습니다.
                </td>
              </tr>
            ) : (
              requirements.map((req) => (
                <tr key={req.id}>
                  <th scope="row" style={{ minInlineSize: '18rem' }}>
                    <span className="font-mono text-xs text-blue-600 mr-2">{req.key}</span>
                    <span className="font-medium">{req.title}</span>
                  </th>
                  {tests.map((test) => {
                    const linked = linkSet.has(`${req.id}:${test.id}`);
                    return (
                      <td key={test.id} className="text-center">
                        {linked ? (
                          <span className="text-green-600 font-bold" aria-label={`${req.key}는 ${test.key}로 검증됨`}>
                            ✓
                          </span>
                        ) : (
                          <span className="text-gray-300" aria-label="연결 없음">
                            ·
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p role="status" className="visually-hidden">
        {requirements.length}개 요구사항, {tests.length}개 테스트
      </p>
    </div>
  );
}
