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
  verificationStatus?: string;
  signedVersionId?: string | null;
  contentHash?: string | null;
}

interface VerifyResult {
  ok: boolean;
  errors: string[];
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
  const [password, setPassword] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

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
        password,
        signatureData: signatureData.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('서명이 등록되었습니다.');
      setSignatureData('');
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['signatures', entityType, entityId] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || '서명 등록에 실패했습니다.'),
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/api/signatures/verify', { entityType, entityId }),
    onSuccess: (res) => {
      setVerifyResult(res.data);
      if (res.data.ok) toast.success('모든 서명이 유효합니다.');
      else toast.error('서명 무결성 검증에 실패했습니다.');
    },
    onError: () => toast.error('서명 검증에 실패했습니다.'),
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
            if (!entityId || !signatureData.trim() || !password) return;
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
            placeholder="서명자 이름 또는 설명"
            value={signatureData}
            onChange={(e: any) => setSignatureData(e.target.value)}
          />
          <Field
            id="signature-password"
            label="비밀번호 재인증"
            type="password"
            placeholder="서명 확인을 위해 비밀번호를 입력하세요"
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            서명은 서버에서 콘텐츠 해시와 HMAC으로 결합되며, 내용이 변경되면 무효가 됩니다.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!entityId || verifyMutation.isPending}
              onClick={() => {
                setVerifyResult(null);
                verifyMutation.mutate();
              }}
            >
              서명 검증
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!entityId || !signatureData.trim() || !password || signMutation.isPending}
            >
              서명 등록
            </button>
          </div>
          {verifyResult && (
            <p role="status" className={`text-sm ${verifyResult.ok ? 'text-green-700' : 'text-red-700'}`}>
              {verifyResult.ok
                ? `검증 통과: ${(signatures ?? []).length}건의 서명이 유효합니다.`
                : `검증 실패: ${verifyResult.errors.join(' / ')}`}
            </p>
          )}
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
                  {s.signedVersionId && (
                    <span className="text-xs text-gray-500">v{s.signedVersionId}</span>
                  )}
                  {s.verificationStatus === 'invalid' && (
                    <span className="badge badge-obsolete" role="status">
                      무효 (내용 변경)
                    </span>
                  )}
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
