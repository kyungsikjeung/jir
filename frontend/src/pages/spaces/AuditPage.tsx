import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import DataTable from '../../components/DataTable';

interface AuditLogRow {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  diff?: any;
  actorIp?: string | null;
  isEvidence: boolean;
  evidenceTag?: string | null;
  createdAt: string;
}

interface VerifyResult {
  valid: boolean;
}

/** 감사 뷰어 — 감사 로그 목록 + 해시 체인 검증 */
export default function AuditPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const [entityType, setEntityType] = useState('space');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const { data: space } = useQuery({
    queryKey: ['space', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}`);
      return res.data;
    },
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', spaceKey, entityType, space?.id],
    queryFn: async () => {
      const res = await apiClient.get('/api/audit', {
        params: { entityType, entityId: space?.id },
      });
      return res.data as AuditLogRow[];
    },
    enabled: !!space,
  });

  const verifyMutation = useMutation({
    mutationFn: async (): Promise<VerifyResult> => {
      const res = await apiClient.post('/api/audit/verify', {
        entityType,
        entityId: space?.id,
      });
      return res.data;
    },
    onSuccess: (result) => {
      setVerifyResult(result);
      if (result.valid) {
        toast.success('해시 체인 검증 완료 — 변조된 기록이 없습니다.');
      } else {
        toast.error('해시 체인 검증 실패 — 변조 가능성이 있습니다.');
      }
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">감사 뷰어</h1>
      </div>

      {/* 해시 체인 검증 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">해시 체인 검증</h2>
        <div className="flex flex-wrap items-end gap-3">
          <select
            aria-label="검증 대상 엔티티"
            className="field"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setVerifyResult(null);
            }}
          >
            <option value="space">스페이스 ({spaceKey})</option>
            <option value="work_item">작업 항목</option>
          </select>
          <button
            type="button"
            className="btn btn-primary"
            disabled={verifyMutation.isPending || !space}
            onClick={() => verifyMutation.mutate()}
          >
            {verifyMutation.isPending ? '검증 중…' : '해시 체인 검증'}
          </button>
          {verifyResult && (
            <span
              role="status"
              className={`badge ${verifyResult.valid ? 'badge-approved' : 'badge-obsolete'}`}
            >
              {verifyResult.valid ? '유효' : '검증 실패'}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          감사 로그의 chainHash 연쇄를 검증합니다. 위조 탐지 시 필요한 정상 상태와 다르면 변조된 것으로 간주합니다.
        </p>
      </div>

      {/* 감사 로그 목록 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">감사 로그 ({spaceKey} 스페이스)</h2>
        {isLoading ? (
          <p role="status">Loading...</p>
        ) : (
          <DataTable
            caption={`${spaceKey} 스페이스 감사 로그`}
            rowKey={(l: any) => l.id}
            columns={[
              {
                key: 'createdAt',
                header: '시각',
                sortable: true,
                type: 'number',
                value: (l: any) => new Date(l.createdAt).getTime(),
                render: (l: any) => new Date(l.createdAt).toLocaleString('ko-KR'),
              },
              { key: 'entityType', header: '엔티티', sortable: true, value: (l: any) => l.entityType },
              { key: 'entityId', header: '대상 ID', value: (l: any) => l.entityId },
              { key: 'action', header: '동작', sortable: true, value: (l: any) => l.action },
              { key: 'actorId', header: '수행자', value: (l: any) => l.actorId ?? '—' },
              { key: 'actorIp', header: 'IP', value: (l: any) => l.actorIp ?? '—' },
              {
                key: 'evidence',
                header: 'Evidence',
                value: (l: any) => (l.isEvidence ? '있음' : '없음'),
                render: (l: any) => (
                  <span className="flex items-center gap-2">
                    {l.isEvidence && (
                      <span className="badge badge-approved">evidence</span>
                    )}
                    {l.evidenceTag && <span className="text-xs text-gray-500">{l.evidenceTag}</span>}
                  </span>
                ),
              },
            ]}
            rows={logs ?? []}
            emptyText="감사 로그가 없습니다."
          />
        )}
      </div>
    </div>
  );
}
