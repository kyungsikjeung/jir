import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';
import { StatusBadge } from '../../components/StatusBadge';

interface IssueRow {
  id: string;
  key: string;
  title: string;
  status: string;
  dueDate?: string | null;
}

interface ApprovalRow {
  id: string;
  approverId: string;
  decision: string;
  signature?: string | null;
  comment?: string | null;
  decidedAt: string;
  item: { key: string; title: string } | null;
}

interface ReviewRow {
  id: string;
  title: string;
  status: string;
  moderatorId: string | null;
  dueDate?: string | null;
  targetType?: string;
  targetId?: string;
}

const DECISION_BADGE: Record<string, string> = {
  approved: 'badge-approved',
  rejected: 'badge-obsolete',
};

/** My Work — 내 작업 항목(assigneeId), 승인 대기(Approval.approverId), 리뷰 대기(Review.moderatorId) */
export default function MyWorkPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await apiClient.get('/api/auth/me');
      return res.data;
    },
  });

  const { data: myIssues, isLoading: issuesLoading } = useQuery({
    queryKey: ['my-work-issues', spaceKey, me?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues`, {
        params: { assigneeId: me?.id },
      });
      return res.data as IssueRow[];
    },
    enabled: !!me?.id,
  });

  const { data: approvals, isLoading: approvalsLoading } = useQuery({
    queryKey: ['approvals', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/approvals`);
      return res.data as ApprovalRow[];
    },
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/reviews`);
      return res.data as ReviewRow[];
    },
  });

  const myApprovals = useMemo(
    () => (approvals ?? []).filter((a) => a.approverId === me?.id),
    [approvals, me],
  );
  const myReviews = useMemo(
    () => (reviews ?? []).filter((r) => r.moderatorId === me?.id),
    [reviews, me],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">My Work</h1>
        <p className="text-sm text-gray-500 mt-1">
          내 작업 항목, 승인 대기, 리뷰 대기 현황입니다.
        </p>
      </div>

      {/* 내 작업 항목 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">내 작업 항목 ({myIssues?.length ?? 0})</h2>
        {issuesLoading ? (
          <p role="status">Loading...</p>
        ) : myIssues && myIssues.length === 0 ? (
          <p className="text-sm text-gray-500">담당자가 지정된 작업 항목이 없습니다.</p>
        ) : (
          <ul className="space-y-2" style={{ listStyle: 'none', padding: 0 }}>
            {(myIssues ?? []).map((i: IssueRow) => (
              <li
                key={i.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/spaces/${spaceKey}/issues/${i.key}`}
                    className="text-blue-600 hover:underline font-mono text-xs"
                  >
                    {i.key}
                  </Link>
                  <span className="font-medium">{i.title}</span>
                  <StatusBadge value={i.status} />
                  {i.dueDate && (
                    <span className="text-xs text-gray-500">
                      {new Date(i.dueDate).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                </div>
                <Link
                  to={`/spaces/${spaceKey}/issues/${i.key}`}
                  className="btn btn-secondary btn-sm"
                >
                  작업 항목
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 승인 대기 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">승인 대기 ({myApprovals.length})</h2>
        {approvalsLoading ? (
          <p role="status">Loading...</p>
        ) : myApprovals.length === 0 ? (
          <p className="text-sm text-gray-500">승인 대기 중인 기록이 없습니다.</p>
        ) : (
          <ul className="space-y-2" style={{ listStyle: 'none', padding: 0 }}>
            {myApprovals.map((a: ApprovalRow) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${DECISION_BADGE[a.decision] ?? 'badge-obsolete'}`}>
                    {a.decision}
                  </span>
                  {a.item && (
                    <Link
                      to={`/spaces/${spaceKey}/issues/${a.item.key}`}
                      className="text-blue-600 hover:underline font-mono text-xs"
                    >
                      {a.item.key}
                    </Link>
                  )}
                  {a.signature && (
                    <span className="text-xs text-gray-500">서명 있음</span>
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(a.decidedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 리뷰 대기 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">리뷰 대기 ({myReviews.length})</h2>
        {reviewsLoading ? (
          <p role="status">Loading...</p>
        ) : myReviews.length === 0 ? (
          <p className="text-sm text-gray-500">리뷰 대기 중인 항목이 없습니다.</p>
        ) : (
          <ul className="space-y-2" style={{ listStyle: 'none', padding: 0 }}>
            {myReviews.map((r: ReviewRow) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/spaces/${spaceKey}/reviews`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {r.title}
                  </Link>
                  <span className="badge badge-obsolete">{r.status}</span>
                  <span className="text-xs text-gray-500">
                    {r.dueDate ? new Date(r.dueDate).toLocaleDateString('ko-KR') : ''}
                  </span>
                </div>
                <Link to={`/spaces/${spaceKey}/reviews`} className="btn btn-secondary btn-sm">
                  리뷰
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
