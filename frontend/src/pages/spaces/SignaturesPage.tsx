import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import Field, { SelectField } from '../../components/Field';

interface IssueRow {
  id: string;
  key: string;
  title: string;
}

interface DocNode {
  id: string;
  key: string;
  title: string;
  children?: DocNode[];
}

interface SignatureRow {
  id: string;
  entityType: string;
  entityId: string;
  signerId: string;
  signatureType: string;
  signatureData: string;
  signedAt: string;
  revokedAt?: string | null;
  signer?: { id: string; displayName: string; email: string } | null;
}

function flatten(nodes: DocNode[], depth = 0): Array<{ node: DocNode; depth: number }> {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flatten(node.children ?? [], depth + 1),
  ]);
}

/** 전자서명 — 작업 항목/문서 서명 등록 및 목록 */
export default function SignaturesPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState('work_item');
  const [entityId, setEntityId] = useState('');
  const [signatureData, setSignatureData] = useState('');

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ['issues', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues`);
      return res.data as IssueRow[];
    },
  });

  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ['docs', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/docs`);
      return res.data as DocNode[];
    },
  });

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await apiClient.get('/api/auth/me');
      return res.data;
    },
  });

  const issueOptions = useMemo(
    () => (issues ?? []).map((i) => ({ value: i.id, label: `${i.key} · ${i.title}` })),
    [issues],
  );
  const docOptions = useMemo(
    () => flatten(pages ?? []).map(({ node }) => ({ value: node.id, label: `${node.key} · ${node.title}` })),
    [pages],
  );
  const entityOptions = entityType === 'work_item' ? issueOptions : docOptions;

  const { data: signatures, isLoading: signaturesLoading } = useQuery({
    queryKey: ['signatures', entityType, entityId],
    queryFn: async () =>
      entityId
        ? ((
            await apiClient.get(
              `/api/signatures?entityType=${entityType}&entityId=${entityId}`,
            )
          ).data as SignatureRow[])
        : [],
    enabled: !!entityId,
  });

  const signMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/api/signatures', {
        entityType,
        entityId,
        signerId: me?.id || 'system',
        signatureData: signatureData.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('서명이 등록되었습니다.');
      setSignatureData('');
      queryClient.invalidateQueries({ queryKey: ['signatures', entityType, entityId] });
    },
    onError: () => toast.error('서명 등록에 실패했습니다.'),
  });

  const isLoading = issuesLoading || pagesLoading;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">전자서명</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">서명 등록</h2>
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!entityId || !signatureData.trim()) return;
            signMutation.mutate();
          }}
        >
          <SelectField
            label="대상"
            value={entityType}
            onChange={(e: any) => {
              setEntityType(e.target.value);
              setEntityId('');
            }}
            options={[
              { value: 'work_item', label: '작업 항목' },
              { value: 'document', label: '문서' },
            ]}
          />
          <SelectField
            label="작업 항목/문서"
            value={entityId}
            onChange={(e: any) => setEntityId(e.target.value)}
            options={[{ value: '', label: '(선택)' }, ...entityOptions]}
            required
          />
          <Field
            id="signature-data"
            label="서명 설명"
            placeholder="서명 데이터 또는 설명"
            value={signatureData}
            onChange={(e: any) => setSignatureData(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!entityId || !signatureData.trim() || signMutation.isPending}
            >
              서명 등록
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">서명 목록</h2>
        {isLoading ? (
          <p role="status">Loading...</p>
        ) : !entityId ? (
          <p className="text-sm text-gray-500">대상을 선택하면 서명 목록이 표시됩니다.</p>
        ) : signaturesLoading ? (
          <p role="status">Loading...</p>
        ) : (signatures ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">서명이 없습니다.</p>
        ) : (
          <ul className="space-y-2" style={{ listStyle: 'none', padding: 0 }}>
            {(signatures ?? []).map((s: SignatureRow) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.signatureData || '(설명 없음)'}</span>
                  <span className="text-xs text-gray-500">
                    {s.signer?.displayName || s.signerId} ·{' '}
                    {new Date(s.signedAt).toLocaleString('ko-KR')}
                  </span>
                  {s.revokedAt && (
                    <span className="badge badge-obsolete" role="status">
                      취소됨
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
