import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import { downloadFile } from '../../services/download';

interface DocNode {
  id: string;
  key: string;
  title: string;
  version: number;
  children?: DocNode[];
}

function flatten(nodes: DocNode[], depth = 0): Array<{ node: DocNode; depth: number }> {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flatten(node.children ?? [], depth + 1),
  ]);
}

async function exportDoc(url: string, filename: string) {
  await downloadFile(url, filename);
  toast.success('내보내기를 시작했습니다.');
}

/** Export — 문서(pdf/docx/html) + 추적성 매트릭스/ASPICE 컴플라이언스(excel) */
export default function ExportPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();

  const { data: docs, isLoading } = useQuery({
    queryKey: ['docs', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/docs`);
      return res.data as DocNode[];
    },
  });

  const rows = useMemo(() => flatten(docs ?? []), [docs]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Export — 내보내기</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">문서 내보내기</h2>
        {isLoading ? (
          <p role="status">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-sm">문서가 없습니다.</p>
        ) : (
          <ul role="list" style={{ listStyle: 'none', padding: 0 }} className="space-y-1">
            {rows.map(({ node, depth }) => (
              <li
                key={node.id}
                className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-b-0"
                style={{ paddingInlineStart: depth ? `${depth * 1.25}rem` : undefined }}
              >
                <Link
                  to={`/spaces/${spaceKey}/docs/${node.id}`}
                  className="font-mono text-xs text-blue-600 hover:underline"
                >
                  {node.key}
                </Link>
                <span className="font-medium text-sm">{node.title}</span>
                <div className="flex gap-2">
                  {(['pdf', 'docx', 'html'] as const).map((format) => (
                    <button
                      key={format}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        exportDoc(
                          `/api/export/documents/${node.id}/${format}`,
                          `${node.key}.${format}`,
                        )
                      }
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">추적성 매트릭스</h2>
        <p className="text-sm text-gray-500 mb-4">
          요구사항–테스트 연결 관계를 Excel로 다운로드합니다.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            exportDoc(
              `/api/export/spaces/${spaceKey}/traceability/excel`,
              `${spaceKey}-traceability.xlsx`,
            )
          }
        >
          엑셀 다운로드
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">ASPICE 컴플라이언스</h2>
        <p className="text-sm text-gray-500 mb-4">
          프로세스별 승인 상태와 증거를 Excel로 다운로드합니다.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            exportDoc(
              `/api/export/spaces/${spaceKey}/compliance/excel`,
              `${spaceKey}-compliance.xlsx`,
            )
          }
        >
          엑셀 다운로드
        </button>
      </div>
    </div>
  );
}
