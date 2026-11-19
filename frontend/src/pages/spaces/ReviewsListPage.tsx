import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';
import DataTable from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { SelectField } from '../../components/Field';

export default function ReviewsListPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const [status, setStatus] = useState('');

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/reviews`);
      return res.data;
    },
  });

  const filtered = useMemo(
    () => (reviews ?? []).filter((r: any) => !status || r.status === status),
    [reviews, status],
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reviews</h1>
      </div>

      <search className="bg-white rounded-lg shadow p-4 mb-4">
        <form
          role="search"
          className="flex flex-wrap gap-3 items-end"
          onSubmit={(e) => e.preventDefault()}
        >
          <SelectField
            label="상태"
            value={status}
            onChange={(e: any) => setStatus(e.target.value)}
            options={[
              { value: '', label: '모든 상태' },
              { value: 'pending', label: 'pending' },
              { value: 'done', label: 'done' },
              { value: 'rejected', label: 'rejected' },
            ]}
          />
          <button type="submit" className="btn btn-secondary">
            필터 적용
          </button>
        </form>
      </search>

      <p role="status" className="text-sm text-gray-500 mb-2">
        {filtered.length}개의 리뷰
      </p>

      {isLoading ? (
        <p role="status">Loading...</p>
      ) : (
        <DataTable
          caption={`${spaceKey} 스페이스 리뷰 목록`}
          rowKey={(r: any) => r.id}
          rowHeader={(r: any) => (
            <Link
              to={`/spaces/${spaceKey}/reviews/${r.id}`}
              className="text-blue-600 hover:underline font-medium"
            >
              {r.title}
            </Link>
          )}
          columns={[
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              value: (r: any) => r.status,
              render: (r: any) => <StatusBadge value={r.status} />,
            },
            { key: 'reviewType', header: 'Type', sortable: true, value: (r: any) => r.reviewType },
            {
              key: 'target',
              header: 'Target',
              value: (r: any) => `${r.targetType ?? ''}:${r.targetId ?? ''}`,
            },
            {
              key: 'dueDate',
              header: 'Due',
              type: 'number',
              value: (r: any) => (r.dueDate ? new Date(r.dueDate).getTime() : 0),
              render: (r: any) => (r.dueDate ? new Date(r.dueDate).toLocaleDateString('ko-KR') : '—'),
            },
            {
              key: 'completedAt',
              header: 'Completed',
              type: 'number',
              value: (r: any) => (r.completedAt ? new Date(r.completedAt).getTime() : 0),
              render: (r: any) => (r.completedAt ? new Date(r.completedAt).toLocaleDateString('ko-KR') : '—'),
            },
          ]}
          rows={filtered}
          emptyText="리뷰가 없습니다."
        />
      )}
    </div>
  );
}
