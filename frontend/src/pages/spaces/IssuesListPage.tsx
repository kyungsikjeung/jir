import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';
import DataTable from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { SelectField } from '../../components/Field';

export default function IssuesListPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues`);
      return res.data;
    },
  });

  const filtered = useMemo(() => {
    let list = issues || [];
    if (status) list = list.filter((i: any) => i.status === status);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i: any) =>
          i.title?.toLowerCase().includes(q) ||
          i.key?.toLowerCase().includes(q) ||
          i.bodyText?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [issues, query, status]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Issues</h1>
        <button type="button" className="btn btn-primary">
          Create Issue
        </button>
      </div>

      {/* 검색·필터 (html 가이드: <search> 요소) */}
      <search className="bg-white rounded-lg shadow p-4 mb-4">
        <form
          role="search"
          className="flex flex-wrap gap-3 items-end"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="field" style={{ marginBlockEnd: 0, minInlineSize: '16rem' }}>
            <label htmlFor="issue-search">Search</label>
            <input
              id="issue-search"
              type="search"
              name="q"
              autoComplete="off"
              placeholder="제목·키·본문 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: '모든 상태' },
              { value: 'open', label: 'open' },
              { value: 'in_review', label: 'in review' },
              { value: 'done', label: 'done' },
            ]}
          />
          <button type="submit" className="btn btn-secondary">
            필터 적용
          </button>
        </form>
      </search>

      <p role="status" className="text-sm text-gray-500 mb-2">
        {filtered.length}개의 작업 항목
      </p>

      {isLoading ? (
        <p role="status">Loading...</p>
      ) : (
        <DataTable
          caption={`${spaceKey} 스페이스 작업 항목 목록`}
          rowKey={(i: any) => i.id}
          rowHeader={(i: any) => (
            <Link to={`/spaces/${spaceKey}/issues/${i.key}`} className="text-blue-600 hover:underline font-medium">
              {i.key}
            </Link>
          )}
          columns={[
            { key: 'key', header: 'Key', sortable: true, value: (i: any) => i.key },
            { key: 'title', header: 'Title', sortable: true, value: (i: any) => i.title },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              value: (i: any) => i.status,
              render: (i: any) => <StatusBadge value={i.status} />,
            },
            {
              key: 'priority',
              header: 'Priority',
              sortable: true,
              value: (i: any) => i.priority,
              render: (i: any) => <StatusBadge value={i.priority} kind="priority" />,
            },
            {
              key: 'type',
              header: 'Type',
              value: (i: any) => i.type?.name || '—',
            },
            {
              key: 'assignee',
              header: 'Assignee',
              value: (i: any) => i.assignee?.displayName || i.assignee?.email || 'Unassigned',
            },
            {
              key: 'updatedAt',
              header: 'Updated',
              type: 'number',
              value: (i: any) => new Date(i.updatedAt).getTime(),
              render: (i: any) => new Date(i.updatedAt).toLocaleDateString('ko-KR'),
            },
          ]}
          rows={filtered}
          emptyText="조건에 맞는 작업 항목이 없습니다."
        />
      )}
    </div>
  );
}
