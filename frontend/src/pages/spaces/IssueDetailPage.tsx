import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import DynamicForm, { missingRequired, type DynamicFieldDef, type UserOption } from '../../components/DynamicForm';
import Field, { SelectField, TextareaField } from '../../components/Field';
import Modal from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';

const TRANSITIONS = ['Draft', 'In Review', 'Approved', 'Released', 'Obsolete'];
const DECISIONS = [
  { value: 'approved', label: '승인 (Approved)' },
  { value: 'rejected', label: '반려 (Rejected)' },
];

interface Member {
  userId: string;
  user?: { id: string; displayName: string; email: string } | null;
}

export default function IssueDetailPage() {
  const { spaceKey, issueKey } = useParams<{ spaceKey: string; issueKey: string }>();
  const queryClient = useQueryClient();
  const [transition, setTransition] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approval, setApproval] = useState({ signature: '', decision: 'approved', comment: '' });

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', issueKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues/${issueKey}`);
      return res.data;
    },
  });

  const { data: space } = useQuery({
    queryKey: ['space', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}`);
      return res.data;
    },
  });

  const { data: fieldDefs } = useQuery({
    queryKey: ['field-defs', spaceKey],
    queryFn: async () =>
      space
        ? ((await apiClient.get(`/api/field-definitions?spaceId=${space.id}`)).data as DynamicFieldDef[])
        : [],
    enabled: !!space,
  });

  const { data: members } = useQuery({
    queryKey: ['members', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/members`);
      return res.data as Member[];
    },
  });

  const { data: links } = useQuery({
    queryKey: ['links', issue?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/trace/links?itemId=${issue.id}`);
      return res.data;
    },
    enabled: !!issue,
  });

  const { data: versions } = useQuery({
    queryKey: ['versions', issueKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues/${issueKey}/versions`);
      return res.data;
    },
    enabled: !!issueKey,
  });

  const { data: comments } = useQuery({
    queryKey: ['issue-comments', issueKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues/${issueKey}/comments`);
      return res.data;
    },
    enabled: !!issue,
  });

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await apiClient.get('/api/auth/me');
      return res.data;
    },
  });

  // 폼 상태를 이슈 데이터로 동기화
  useEffect(() => {
    if (!issue) return;
    setTitle(issue.title);
    setDescription(issue.bodyText || issue.description || '');
    setCustomFields(issue.customFields ?? {});
  }, [issue]);

  const transitionMutation = useMutation({
    mutationFn: (toState: string) =>
      apiClient.post(`/api/spaces/${spaceKey}/issues/${issueKey}/transitions`, {
        transition: toState,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueKey] });
      setTransition('');
      toast.success('상태가 변경되었습니다.');
    },
    onError: () => toast.error('상태 변경에 실패했습니다.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.put(`/api/spaces/${spaceKey}/issues/${issueKey}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueKey] });
      toast.success('저장했습니다.');
    },
    onError: () => toast.error('저장하지 못했습니다.'),
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) =>
      apiClient.post(`/api/spaces/${spaceKey}/issues/${issueKey}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-comments', issueKey] });
      setCommentBody('');
      toast.success('댓글이 등록되었습니다.');
    },
  });

  const resolveSuspectMutation = useMutation({
    mutationFn: (linkId: string) =>
      apiClient.post(`/api/spaces/${spaceKey}/trace/suspect/${linkId}/resolve`, {
        resolution: 'confirmed',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', issue?.id] });
      toast.success('suspect 표시를 확인했습니다.');
    },
    onError: () => toast.error('확인하지 못했습니다.'),
  });

  const approvalMutation = useMutation({
    mutationFn: async () =>
      apiClient.post('/api/workflows/approvals', {
        entityType: 'work_item',
        entityId: issue.id,
        approverId: me?.id || 'system',
        decision: approval.decision,
        comment: approval.comment || undefined,
        signature: approval.signature || undefined,
        signatureMethod: approval.signature ? 'typed' : undefined,
      }),
    onSuccess: () => {
      toast.success('승인 이력이 등록되었습니다.');
      setApprovalOpen(false);
    },
    onError: () => toast.error('승인 등록에 실패했습니다.'),
  });

  const userOptions: UserOption[] = (members ?? []).map((m) => ({
    value: m.userId,
    label: m.user?.displayName || m.userId,
  }));

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = missingRequired(fieldDefs ?? [], customFields);
    if (Object.keys(errs).length) {
      setCustomErrors(errs);
      toast.error('필수 필드를 입력해 주세요.');
      return;
    }
    setCustomErrors({});
    updateMutation.mutate({ title, description, customFields });
  };

  if (isLoading) return <p role="status">Loading...</p>;
  if (!issue) return <div>Issue not found</div>;

  return (
    <article className="bg-white rounded-lg shadow p-6">
      <nav aria-label="경로" className="text-sm text-gray-500 mb-2">
        <Link to={`/spaces/${spaceKey}/issues`} className="hover:underline">
          Issues
        </Link>{' '}
        / <span aria-current="page">{issue.key}</span>
      </nav>

      <header className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <p className="text-sm text-gray-500">{issue.key}</p>
          <h1 className="text-2xl font-bold">{issue.title}</h1>
        </div>
        <StatusBadge value={issue.status} />
      </header>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-sm">
        <div>
          <dt className="text-gray-500">Priority</dt>
          <dd className="font-medium">{issue.priority}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Type</dt>
          <dd className="font-medium">{issue.type?.name || '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Assignee</dt>
          <dd className="font-medium">
            {issue.assignee?.displayName || issue.assignee?.email || 'Unassigned'}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Reporter</dt>
          <dd className="font-medium">
            {issue.reporter?.displayName || issue.reporter?.email || '—'}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Created</dt>
          <dd className="font-medium">{new Date(issue.createdAt).toLocaleDateString('ko-KR')}</dd>
        </div>
        <div>
          <dt className="text-gray-500">ASPICE</dt>
          <dd className="font-medium">{issue.aspiceProcess || '—'}</dd>
        </div>
      </dl>

      {/* 작업 항목 수정 (동적 필드·설명) */}
      <section aria-labelledby="edit-heading" className="mb-6 border-t pt-4">
        <h2 id="edit-heading" className="text-lg font-semibold mb-3">
          작업 항목 수정
        </h2>
        <form className="flex flex-col gap-4" onSubmit={handleUpdate} noValidate>
          <DynamicForm
            fields={fieldDefs ?? []}
            values={customFields}
            onChange={setCustomFields}
            userOptions={userOptions}
            errors={customErrors}
          />
          <Field
            id="issue-description"
            label="설명"
            value={description}
            onChange={(e: any) => setDescription(e.target.value)}
            placeholder="설명을 입력하세요"
          />
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
              저장
            </button>
          </div>
        </form>
      </section>

      {/* 연결된 항목 링크 패널 */}
      {(links ?? []).length > 0 && (
        <section aria-labelledby="links-heading" className="mb-6 border-t pt-4">
          <h2 id="links-heading" className="text-lg font-semibold mb-3">
            연결된 항목 ({links?.length})
          </h2>
          <ul className="space-y-2" style={{ listStyle: 'none', padding: 0 }}>
            {(links ?? []).map((l: any) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-blue-600">
                    {l.direction === 'out' ? `→ ${l.partnerKey}` : `← ${l.partnerKey}`}
                  </span>
                  {l.partnerTitle && <span className="text-gray-700">{l.partnerTitle}</span>}
                  <span className="rounded bg-white px-2 py-0.5 text-xs border border-slate-200">
                    {l.linkType}
                  </span>
                  {l.isSuspect && (
                    <span
                      className="badge badge-obsolete"
                      role="status"
                      aria-label={`${l.partnerKey}suspect`}
                    >
                      suspect
                    </span>
                  )}
                </div>
                {l.isSuspect && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => resolveSuspectMutation.mutate(l.id)}
                    disabled={resolveSuspectMutation.isPending}
                  >
                    확인
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 버전 이력 타임라인 */}
      {(versions ?? []).length > 0 && (
        <section aria-labelledby="versions-heading" className="mb-6 border-t pt-4">
          <h2 id="versions-heading" className="text-lg font-semibold mb-3">
            버전 이력
          </h2>
          <ol className="relative pl-5 space-y-3" style={{ listStyle: 'none', padding: 0, paddingInlineStart: '1.25rem' }}>
            {(versions ?? []).map((v: any) => (
              <li key={v.id} className="relative">
                <span
                  className="absolute -left-5 top-2 block w-px h-full bg-slate-200"
                  aria-hidden="true"
                />
                <div className="text-sm">
                  <span className="font-medium">v{v.version}</span>
                  <span className="text-gray-500">
                    {' · '}
                    {v.changedBy?.displayName || v.changedBy?.email || '—'} ·{' '}
                    {new Date(v.createdAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                {v.title && <p className="text-sm text-gray-700">{v.title}</p>}
                {v.bodyText && (
                  <p className="text-sm text-gray-600">{v.bodyText.slice(0, 160)}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="workflow-heading" className="mb-6 border-t pt-4">
        <h2 id="workflow-heading" className="text-lg font-semibold mb-3">
          워크플로우
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <SelectField
            label="다음 상태"
            name="transition"
            value={transition}
            onChange={(e: any) => setTransition(e.target.value)}
            options={TRANSITIONS.map((t) => ({ value: t, label: t }))}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!transition}
            onClick={(e) => {
              e.preventDefault();
              if (transition) transitionMutation.mutate(transition);
            }}
          >
            상태 변경
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setApprovalOpen(true)}
          >
            승인/반려 서명
          </button>
        </div>
      </section>

      <section aria-labelledby="comments-heading" className="border-t pt-4">
        <h2 id="comments-heading" className="text-lg font-semibold mb-3">
          Comments
        </h2>
        {comments?.length === 0 && <p className="text-gray-500 text-sm">No comments yet</p>}
        <ul className="space-y-3 mb-4" style={{ listStyle: 'none', padding: 0 }}>
          {comments?.map((c: any) => (
            <li key={c.id} className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                {c.author?.displayName || c.author?.email || 'system'} ·{' '}
                {new Date(c.createdAt).toLocaleString('ko-KR')}
              </p>
              <p className="text-sm">{c.body}</p>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (commentBody.trim()) commentMutation.mutate(commentBody.trim());
          }}
        >
          <TextareaField
            label="댓글 추가"
            name="comment"
            rows={2}
            value={commentBody}
            onChange={(e: any) => setCommentBody(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!commentBody.trim()}>
            댓글 등록
          </button>
        </form>
      </section>

      {/* 승인/반려 서명 모달 */}
      <Modal open={approvalOpen} onClose={() => setApprovalOpen(false)} title="승인/반려 서명">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            approvalMutation.mutate();
          }}
        >
          <Field
            id="approval-signature"
            label="서명"
            value={approval.signature}
            onChange={(e: any) => setApproval((p) => ({ ...p, signature: e.target.value }))}
            placeholder="서명을 입력하세요"
          />
          <SelectField
            id="approval-decision"
            label="결정"
            value={approval.decision}
            onChange={(e: any) => setApproval((p) => ({ ...p, decision: e.target.value }))}
            options={DECISIONS.map((d) => ({ value: d.value, label: d.label }))}
          />
          <TextareaField
            id="approval-comment"
            label="코멘트"
            rows={2}
            value={approval.comment}
            onChange={(e: any) => setApproval((p) => ({ ...p, comment: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setApprovalOpen(false)}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={approvalMutation.isPending}
            >
              등록
            </button>
          </div>
        </form>
      </Modal>
    </article>
  );
}
