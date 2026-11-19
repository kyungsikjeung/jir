import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import Field, { SelectField, TextareaField } from '../../components/Field';
import { StatusBadge } from '../../components/StatusBadge';

const REVIEW_STATUSES = ['pending', 'done', 'rejected'];
const SEVERITIES = ['minor', 'major', 'critical'];

interface FindingRow {
  id: string;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  location?: unknown;
  createdAt: string;
  resolvedAt?: string | null;
}

export default function ReviewDetailPage() {
  const { spaceKey, reviewId } = useParams<{ spaceKey: string; reviewId: string }>();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [findingTitle, setFindingTitle] = useState('');
  const [findingDescription, setFindingDescription] = useState('');
  const [findingSeverity, setFindingSeverity] = useState('minor');
  const [findingLocation, setFindingLocation] = useState('');

  const { data: review, isLoading } = useQuery({
    queryKey: ['review', reviewId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/reviews/${reviewId}`);
      return res.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: (nextStatus: string) =>
      apiClient.patch(`/api/spaces/${spaceKey}/reviews/${reviewId}`, { status: nextStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', spaceKey] });
      toast.success('리뷰 상태가 변경되었습니다.');
      setStatus('');
    },
    onError: () => toast.error('상태 변경에 실패했습니다.'),
  });

  const findingMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/spaces/${spaceKey}/reviews/${reviewId}/findings`, {
        title: findingTitle,
        description: findingDescription || undefined,
        severity: findingSeverity,
        location: findingLocation || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] });
      toast.success('Finding이 등록되었습니다.');
      setFindingTitle('');
      setFindingDescription('');
      setFindingLocation('');
    },
    onError: () => toast.error('Finding 등록에 실패했습니다.'),
  });

  if (isLoading) return <p role="status">Loading...</p>;
  if (!review) return <div>Review not found</div>;

  const findings: FindingRow[] = review.findings ?? [];

  return (
    <article className="bg-white rounded-lg shadow p-6">
      <nav aria-label="경로" className="text-sm text-gray-500 mb-2">
        <Link to={`/spaces/${spaceKey}/reviews`} className="hover:underline">
          Reviews
        </Link>{' '}
        / <span aria-current="page">{review.title}</span>
      </nav>

      <header className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">{review.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {review.reviewType ?? '—'} · {review.targetType ?? '—'}:{review.targetId ?? '—'}
          </p>
        </div>
        <StatusBadge value={review.status} />
      </header>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-sm">
        <div>
          <dt className="text-gray-500">리뷰 유형</dt>
          <dd className="font-medium">{review.reviewType || '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">대상</dt>
          <dd className="font-medium">{`${review.targetType || ''}:${review.targetId || ''}`}</dd>
        </div>
        <div>
          <dt className="text-gray-500">마감일</dt>
          <dd className="font-medium">
            {review.dueDate ? new Date(review.dueDate).toLocaleDateString('ko-KR') : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">완료 일시</dt>
          <dd className="font-medium">
            {review.completedAt ? new Date(review.completedAt).toLocaleString('ko-KR') : '—'}
          </dd>
        </div>
      </dl>

      {review.description && (
        <section className="mb-6" aria-labelledby="review-desc-heading">
          <h2 id="review-desc-heading" className="text-lg font-semibold mb-2">
            Description
          </h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.description}</p>
        </section>
      )}

      <section aria-labelledby="review-status-heading" className="mb-6 border-t pt-4">
        <h2 id="review-status-heading" className="text-lg font-semibold mb-3">
          상태
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <SelectField
            label="다음 상태"
            value={status}
            onChange={(e: any) => setStatus(e.target.value)}
            options={REVIEW_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!status}
            onClick={() => status && statusMutation.mutate(status)}
          >
            상태 변경
          </button>
        </div>
      </section>

      <section aria-labelledby="findings-heading" className="mb-6 border-t pt-4">
        <h2 id="findings-heading" className="text-lg font-semibold mb-3">
          Findings ({findings.length})
        </h2>
        <form
          className="flex flex-col gap-3 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (findingTitle.trim()) findingMutation.mutate();
          }}
          noValidate
        >
          <Field
            id="finding-title"
            label="Finding 제목"
            required
            value={findingTitle}
            onChange={(e: any) => setFindingTitle(e.target.value)}
            placeholder="Finding 제목"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="심각도"
              value={findingSeverity}
              onChange={(e: any) => setFindingSeverity(e.target.value)}
              options={SEVERITIES.map((s) => ({ value: s, label: s }))}
            />
            <Field
              id="finding-location"
              label="위치 (선택)"
              value={findingLocation}
              onChange={(e: any) => setFindingLocation(e.target.value)}
              placeholder="예: 장점 1.2"
            />
          </div>
          <TextareaField
            id="finding-description"
            label="설명 (선택)"
            rows={2}
            value={findingDescription}
            onChange={(e: any) => setFindingDescription(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={findingMutation.isPending || !findingTitle.trim()}
            >
              Finding 추가
            </button>
          </div>
        </form>
        {findings.length === 0 && <p className="text-sm text-gray-500">Finding이 없습니다.</p>}
        <ul className="space-y-2" style={{ listStyle: 'none', padding: 0 }}>
          {findings.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-medium">{f.title}</span>
                <span className="rounded bg-white px-2 py-0.5 text-xs border border-slate-200">
                  {f.severity}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(f.createdAt).toLocaleString('ko-KR')}
                </span>
                {f.location ? (
                  <span className="text-xs text-gray-600">위치: {String(f.location)}</span>
                ) : null}
                {f.resolvedAt && (
                  <span className="badge badge-approved">해결 {new Date(f.resolvedAt).toLocaleDateString('ko-KR')}</span>
                )}
              </div>
              {f.description && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{f.description}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
