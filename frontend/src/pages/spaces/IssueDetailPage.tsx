import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api.client';
import { SelectField, TextareaField } from '../../components/Field';
import { StatusBadge } from '../../components/StatusBadge';

const TRANSITIONS = ['Draft', 'In Review', 'Approved', 'Released', 'Obsolete'];

export default function IssueDetailPage() {
  const { spaceKey, issueKey } = useParams<{ spaceKey: string; issueKey: string }>();
  const queryClient = useQueryClient();
  const [transition, setTransition] = useState('');
  const [commentBody, setCommentBody] = useState('');

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', issueKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues/${issueKey}`);
      return res.data;
    },
  });

  const { data: comments } = useQuery({
    queryKey: ['issue-comments', issueKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues/${issueKey}/comments`);
      return res.data;
    },
    enabled: !!issue,
  });

  const transitionMutation = useMutation({
    mutationFn: (toState: string) =>
      apiClient.post(`/api/spaces/${spaceKey}/issues/${issueKey}/transitions`, {
        transition: toState,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueKey] });
      setTransition('');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) =>
      apiClient.post(`/api/spaces/${spaceKey}/issues/${issueKey}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-comments', issueKey] });
      setCommentBody('');
    },
  });

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
          <dd className="font-medium">{issue.reporter?.displayName || issue.reporter?.email || '—'}</dd>
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

      {issue.description && (
        <section aria-labelledby="desc-heading" className="mb-6">
          <h2 id="desc-heading" className="text-lg font-semibold mb-2">
            Description
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap">{issue.bodyText || issue.description}</p>
        </section>
      )}

      <section aria-labelledby="transition-heading" className="mb-6 border-t pt-4">
        <h2 id="transition-heading" className="text-lg font-semibold mb-2">
          워크플로우
        </h2>
        <form
          className="flex flex-wrap gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (transition) transitionMutation.mutate(transition);
          }}
        >
          <SelectField
            label="다음 상태"
            name="transition"
            value={transition}
            onChange={(e: any) => setTransition(e.target.value)}
            options={TRANSITIONS.map((t) => ({ value: t, label: t }))}
          />
          <button type="submit" className="btn btn-primary" disabled={!transition}>
            상태 변경
          </button>
        </form>
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
    </article>
  );
}
