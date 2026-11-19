import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import { downloadFile } from '../../services/download';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';

interface ProcessSummary {
  processCode: string;
  processName: string;
  category?: string;
  level?: number;
  totalItems: number;
  completedItems: number;
  completionPercent: number;
  totalDeliverables: number;
  releasedDeliverables: number;
}

interface Checklist {
  id: string;
  itemName: string;
  description?: string | null;
  isRequired: boolean;
  status: string;
}

interface ProjectDeliverable {
  id: string;
  deliverableId: string;
  status: string;
}

interface ProcessDetail {
  processCode: string;
  processName: string;
  checklists: Checklist[];
  deliverables: ProjectDeliverable[];
  deliverableCatalog: Array<{ id: string; name: string; shortName?: string | null }>;
}

interface BaselineRow {
  id: string;
  name: string;
  version?: string | null;
  baselineType: string;
  status: string;
  isLocked: boolean;
  lockReason?: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  not_started: '시작 전',
  in_progress: '진행 중',
  completed: '완료',
  blocked: '차단됨',
  not_applicable: '해당 없음',
};

export default function CompliancePage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [lockTarget, setLockTarget] = useState<BaselineRow | null>(null);
  const [lockReason, setLockReason] = useState('');
  const [diffTarget, setDiffTarget] = useState<BaselineRow | null>(null);

  const { data: compliance, isLoading } = useQuery({
    queryKey: ['compliance', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/compliance`);
      return res.data as ProcessSummary[];
    },
  });

  const { data: baselines, isLoading: baselinesLoading } = useQuery({
    queryKey: ['compliance-baselines', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/compliance/baselines`);
      return res.data as BaselineRow[];
    },
  });

  const { data: diff, isLoading: diffLoading } = useQuery({
    queryKey: ['compliance-baseline-diff', spaceKey, diffTarget?.id],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/spaces/${spaceKey}/compliance/baselines/${diffTarget!.id}/diff`,
      );
      return res.data;
    },
    enabled: !!diffTarget,
  });

  const lockMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/spaces/${spaceKey}/compliance/baselines/${lockTarget!.id}/lock`, {
        reason: lockReason || undefined,
      }),
    onSuccess: () => {
      toast.success('기준선이 잠겼습니다.');
      queryClient.invalidateQueries({ queryKey: ['compliance-baselines', spaceKey] });
      setLockTarget(null);
    },
    onError: () => toast.error('기준선 잠금에 실패했습니다.'),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['compliance-detail', spaceKey, selected],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/compliance/${selected}`);
      return res.data as ProcessDetail;
    },
    enabled: !!selected,
  });

  const toggleChecklist = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiClient.put(`/api/spaces/${spaceKey}/compliance/checklists/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-detail', spaceKey, selected] });
      queryClient.invalidateQueries({ queryKey: ['compliance', spaceKey] });
      queryClient.invalidateQueries({ queryKey: ['coverage', spaceKey] });
    },
    onError: () => toast.error('체크리스트 상태를 변경하지 못했습니다.'),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadFile(
        `/api/export/spaces/${spaceKey}/compliance/excel`,
        `${spaceKey}-compliance.xlsx`,
      );
      toast.success('컴플라이언스 현황을 내보냈습니다.');
    } catch {
      toast.error('내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  const total = compliance?.length ?? 0;
  const avg = total
    ? compliance!.reduce((sum, p) => sum + (p.completionPercent || 0), 0) / total
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">ASPICE 컴플라이언스</h1>
          <p className="text-sm text-gray-500 mt-1">
            적용 프로세스별 체크리스트와 산출물 준비 현황
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

      <section className="bg-white rounded-lg shadow p-6" aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="text-sm font-medium text-gray-500 mb-2">
          전체 평균 완료율
        </h2>
        <div className="flex flex-wrap items-center gap-6">
          <p className="text-3xl font-bold text-indigo-600">{avg.toFixed(1)}%</p>
          <div className="flex-1 min-w-[12rem]">
            <progress value={avg} max={100} aria-label={`전체 평균 완료율 ${avg.toFixed(1)}%`}>
              {avg.toFixed(1)}%
            </progress>
          </div>
          <p className="text-sm text-gray-600">{total}개 프로세스 적용</p>
        </div>
      </section>

      {isLoading ? (
        <p role="status">Loading...</p>
      ) : (
        <DataTable<ProcessSummary>
          caption="ASPICE 프로세스별 컴플라이언스 현황"
          rowKey={(row) => row.processCode}
          rowHeader={(row) => <span className="font-mono text-xs">{row.processCode}</span>}
          columns={[
            {
              key: 'processCode',
              header: 'Process',
              sortable: true,
              value: (row) => row.processCode,
            },
            {
              key: 'processName',
              header: 'Name',
              sortable: true,
              value: (row) => row.processName,
            },
            {
              key: 'totalItems',
              header: 'Items',
              sortable: true,
              type: 'number',
              value: (row) => row.totalItems,
            },
            {
              key: 'completedItems',
              header: 'Completed',
              sortable: true,
              type: 'number',
              value: (row) => row.completedItems,
            },
            {
              key: 'completionPercent',
              header: 'Progress',
              sortable: true,
              type: 'number',
              value: (row) => row.completionPercent,
              render: (row) => (
                <div className="flex items-center gap-2 min-w-[9rem]">
                  <progress
                    value={row.completionPercent}
                    max={100}
                    aria-label={`${row.processCode} 완료율 ${row.completionPercent.toFixed(1)}%`}
                  >
                    {row.completionPercent.toFixed(1)}%
                  </progress>
                  <span className="text-xs whitespace-nowrap">
                    {row.completionPercent.toFixed(1)}%
                  </span>
                </div>
              ),
            },
            {
              key: 'deliverables',
              header: '산출물',
              type: 'number',
              value: (row) => row.releasedDeliverables,
              render: (row) => (
                <span className="text-xs whitespace-nowrap">
                  {row.releasedDeliverables} / {row.totalDeliverables} 릴리스
                </span>
              ),
            },
            {
              key: 'action',
              header: '상세',
              render: (row) => (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelected(row.processCode)}
                >
                  보기
                </button>
              ),
            },
          ]}
          rows={compliance ?? []}
          emptyText="적용된 ASPICE 프로세스가 없습니다."
        />
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={detail ? `${detail.processCode} · ${detail.processName}` : '프로세스 상세'}
      >
        {detailLoading ? (
          <p role="status">Loading...</p>
        ) : !detail ? (
          <p className="text-sm text-gray-500">데이터가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-6 max-h-[65dvh] overflow-y-auto pr-1">
            <section aria-labelledby="checklist-heading">
              <h3 id="checklist-heading" className="text-sm font-bold mb-2">
                체크리스트 ({detail.checklists.filter((c) => c.status === 'completed').length} /{' '}
                {detail.checklists.length})
              </h3>
              {detail.checklists.length === 0 ? (
                <p className="text-sm text-gray-500">등록된 체크리스트가 없습니다.</p>
              ) : (
                <ul className="flex flex-col gap-2" style={{ listStyle: 'none', padding: 0 }}>
                  {detail.checklists.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 bg-slate-50 rounded-lg p-3">
                      <input
                        type="checkbox"
                        id={`check-${item.id}`}
                        checked={item.status === 'completed'}
                        onChange={(e) =>
                          toggleChecklist.mutate({
                            id: item.id,
                            status: e.target.checked ? 'completed' : 'not_started',
                          })
                        }
                        className="mt-1"
                        style={{ inlineSize: '1.25rem', blockSize: '1.25rem' }}
                      />
                      <label htmlFor={`check-${item.id}`} className="text-sm cursor-pointer">
                        <span className="font-medium">{item.itemName}</span>
                        {item.isRequired && (
                          <span className="badge badge-critical ml-2">필수</span>
                        )}
                        <span className="badge badge-obsolete ml-2">
                          {STATUS_LABEL[item.status] ?? item.status}
                        </span>
                        {item.description && (
                          <span className="block text-xs text-gray-500 mt-0.5">
                            {item.description}
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="deliverables-heading">
              <h3 id="deliverables-heading" className="text-sm font-bold mb-2">
                산출물
              </h3>
              {detail.deliverables.length === 0 ? (
                <p className="text-sm text-gray-500">등록된 산출물이 없습니다.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm" style={{ listStyle: 'none', padding: 0 }}>
                  {detail.deliverables.map((d) => {
                    const catalog = detail.deliverableCatalog.find((c) => c.id === d.deliverableId);
                    return (
                      <li key={d.id} className="flex flex-wrap items-center gap-2">
                        <span>{catalog?.shortName || catalog?.name || d.deliverableId}</span>
                        <span className="badge badge-obsolete">
                          {STATUS_LABEL[d.status] ?? d.status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </Modal>

      {/* 기준선 (Baselines) — 비교/잠금 */}
      <section aria-labelledby="baseline-heading" className="bg-white rounded-lg shadow p-6">
        <h2 id="baseline-heading" className="text-lg font-semibold mb-3">
          기준선 (Baselines)
        </h2>
        {baselinesLoading ? (
          <p role="status">Loading...</p>
        ) : (
          <>
            <DataTable<BaselineRow>
              caption={`${spaceKey} 스페이스 기준선 목록`}
              rowKey={(b) => b.id}
              columns={[
                { key: 'name', header: 'Name', sortable: true, value: (b) => b.name },
                { key: 'version', header: 'Version', sortable: true, value: (b) => b.version ?? '' },
                { key: 'baselineType', header: 'Type', value: (b) => b.baselineType },
                { key: 'status', header: 'Status', sortable: true, value: (b) => b.status },
                {
                  key: 'isLocked',
                  header: '잠금',
                  sortable: true,
                  value: (b) => (b.isLocked ? 1 : 0),
                  render: (b) =>
                    b.isLocked ? (
                      <span className="badge badge-approved">잠금</span>
                    ) : (
                      <span className="badge badge-obsolete">—</span>
                    ),
                },
                { key: 'lockReason', header: '잠금 사유', value: (b) => b.lockReason ?? '' },
                {
                  key: 'actions',
                  header: '',
                  value: () => 0,
                  render: (b) => (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setDiffTarget((d) => (d && d.id === b.id ? null : b))}
                      >
                        {diffTarget?.id === b.id ? '비교 닫기' : '비교'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={b.isLocked}
                        onClick={() => {
                          setLockTarget(b);
                          setLockReason('');
                        }}
                      >
                        잠금
                      </button>
                    </div>
                  ),
                },
              ]}
              rows={baselines ?? []}
              emptyText="기준선이 없습니다."
            />
            {diffTarget && diff && (
              <div
                className="mt-4 pt-4 border-t border-gray-100"
                aria-labelledby="baseline-diff-heading"
              >
                <h3 id="baseline-diff-heading" className="text-sm font-semibold mb-2">
                  {diffTarget.name} — 기준선 비교
                </h3>
                {diffLoading ? (
                  <p role="status">Loading...</p>
                ) : diff.changedSinceBaseline.length === 0 && diff.addedSinceBaseline.length === 0 ? (
                  <p className="text-sm text-gray-500">변경된 항목이 없습니다.</p>
                ) : (
                  <ul
                    className="text-sm"
                    style={{ listStyle: 'none', padding: 0 }}
                  >
                    {diff.changedSinceBaseline.map((c: any) => (
                      <li key={c.itemId}>
                        변경됨: {c.itemId} ({c.baselineVersion} → {c.currentVersion})
                      </li>
                    ))}
                    {diff.addedSinceBaseline.map((c: any) => (
                      <li key={c.itemId}>
                        추가됨: {c.itemId} (현재 {c.currentVersion})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <Modal
        open={!!lockTarget}
        onClose={() => setLockTarget(null)}
        title={`${lockTarget?.name ?? ''} · 잠금`}
      >
        {lockTarget && (
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              lockMutation.mutate();
            }}
          >
            <div className="field">
              <label htmlFor="baseline-lock-reason">잠금 사유 (선택)</label>
              <input
                id="baseline-lock-reason"
                type="text"
                maxLength={200}
                placeholder="예: 기준선 고정"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
              />
            </div>
            <p className="text-sm text-gray-500">
              잠금 후 기준선의 BaselineItem 변경이 금지됩니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setLockTarget(null)}
              >
                취소
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={lockMutation.isPending}
              >
                {lockMutation.isPending ? '잠글 중…' : '잠금'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
