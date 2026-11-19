import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';

interface Approval {
  id: string;
  entityType: string;
  entityId: string;
  approverId: string;
  decision: string;
  comment?: string | null;
  signature?: string | null;
  signatureMethod?: string | null;
  decidedAt: string;
  approver: { id: string; displayName: string; email: string } | null;
  item: { key: string; title: string } | null;
}

const DECISION_BADGE: Record<string, string> = {
  approved: 'badge-approved',
  rejected: 'badge-obsolete',
};

/** 승인(Approvals) — 승인 목록/상세(확인). decision='approved'면 작업 항목 status 'Approved' 반영 */
export default function ApprovalsPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const [detail, setDetail] = useState<Approval | null>(null);

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['approvals', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/approvals`);
      return res.data as Approval[];
    },
  });

  const badge = (a: any) =>
    <span className={`badge ${DECISION_BADGE[a.decision] ?? 'badge-obsolete'}`}>{a.decision}</span>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">승인 (Approvals)</h1>
      </div>
      <p role="status" className="text-sm text-gray-500 mb-2">
        {(approvals ?? []).length}개의 승인 기록
      </p>
      {isLoading ? (
        <p role="status">Loading...</p>
      ) : (
        <DataTable
          caption={`${spaceKey} 스페이스 승인 목록`}
          rowKey={(a: any) => a.id}
          columns={[
            {
              key: 'decision',
              header: '결정',
              sortable: true,
              value: (a: any) => a.decision,
              render: (a: any) => badge(a),
            },
            {
              key: 'item',
              header: '대상',
              value: (a: any) => a.item?.key ?? a.entityId,
              render: (a: any) =>
                a.item ? (
                  <Link
                    to={`/spaces/${spaceKey}/issues/${a.item.key}`}
                    className="font-mono text-xs text-blue-600 hover:underline"
                  >
                    {a.item.key}
                  </Link>
                ) : (
                  <span className="font-mono text-xs text-gray-500">{a.entityId}</span>
                ),
            },
            {
              key: 'approver',
              header: '승인자',
              value: (a: any) => a.approver?.displayName ?? a.approverId,
              render: (a: any) => a.approver?.displayName ?? a.approverId,
            },
            {
              key: 'decidedAt',
              header: '결정 시각',
              type: 'number',
              value: (a: any) => new Date(a.decidedAt).getTime(),
              render: (a: any) => new Date(a.decidedAt).toLocaleString('ko-KR'),
            },
            {
              key: 'signature',
              header: '서명',
              value: (a: any) => (a.signature ? '있음' : '—'),
            },
            {
              key: 'actions',
              header: '',
              value: () => 0,
              render: (a: any) => (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDetail(a)}
                >
                  확인
                </button>
              ),
            },
          ]}
          rows={approvals ?? []}
          emptyText="승인 기록이 없습니다."
        />
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="승인 상세">
        {detail && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">대상</dt>
              <dd>
                {detail.item ? (
                  <Link
                    to={`/spaces/${spaceKey}/issues/${detail.item.key}`}
                    className="font-mono text-xs text-blue-600 hover:underline"
                  >
                    {detail.item.key}
                  </Link>
                ) : (
                  detail.entityId
                )}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">결정</dt>
              <dd>{badge(detail)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">승인자</dt>
              <dd className="font-medium">{detail.approver?.displayName ?? detail.approverId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">결정 시각</dt>
              <dd>{new Date(detail.decidedAt).toLocaleString('ko-KR')}</dd>
            </div>
            {detail.signature && (
              <div>
                <dt className="text-gray-500">서명</dt>
                <dd className="font-medium">{detail.signature}</dd>
              </div>
            )}
            {detail.signatureMethod && (
              <div>
                <dt className="text-gray-500">서명 방식</dt>
                <dd>{detail.signatureMethod}</dd>
              </div>
            )}
            {detail.comment && (
              <div>
                <dt className="text-gray-500">코멘트</dt>
                <dd>{detail.comment}</dd>
              </div>
            )}
          </dl>
        )}
      </Modal>
    </div>
  );
}
