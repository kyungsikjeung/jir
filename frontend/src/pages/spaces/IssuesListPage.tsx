import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import DynamicForm, { missingRequired, type DynamicFieldDef } from '../../components/DynamicForm';
import { StatusBadge } from '../../components/StatusBadge';
import { SelectField } from '../../components/Field';

interface Member {
  userId: string;
  user?: { id: string; displayName: string; email: string } | null;
}

function fieldOptions(f: DynamicFieldDef) {
  const opts = Array.isArray(f.validation?.options) ? f.validation.options : [];
  return opts.map((o: any) => (typeof o === 'string' ? o : o?.value ?? o));
}

function renderDynamicValue(value: any, f: DynamicFieldDef) {
  if (value === undefined || value === null || value === '') return '—';
  if (f.fieldType === 'boolean') return value ? '✓' : '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

function CreateIssueForm({
  fieldDefs,
  userOptions,
  onClose,
  onCreated,
}: {
  fieldDefs: DynamicFieldDef[];
  userOptions: Array<{ value: string; label: string }>;
  onClose: () => void;
  onCreated: (key?: string) => void;
}) {
  const spaceKey = useParams<{ spaceKey: string }>().spaceKey;
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [typeId, setTypeId] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 작업 항목 타입 목록: 현재 목록에 있는 타입에서 수집 (비어 있으면 서버 기본값 'task')
  const typeOptions = useMemo(() => {
    const { data } = queryClient.getQueryState(['issues', spaceKey]) ?? {};
    const items = (data as any)?.data ?? [];
    const types: Array<{ id: string; name: string }> = [];
    items.forEach((i: any) => {
      if (i.type?.id && !types.some((t) => t.id === i.type.id)) types.push({ id: i.type.id, name: i.type.name });
    });
    return types;
  }, [spaceKey, queryClient]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/api/spaces/${spaceKey}/issues`, {
        title,
        typeId: typeId || undefined,
        priority: priority || undefined,
        assigneeId: assigneeId || undefined,
        customFields,
      });
      return res.data;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['issues', spaceKey] });
      toast.success('작업 항목을 생성했습니다.');
      onClose();
      onCreated(item?.key);
    },
    onError: () => toast.error('작업 항목 생성에 실패했습니다.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = '제목은 필수입니다.';
    const missing = missingRequired(fieldDefs, customFields);
    setErrors({ ...nextErrors, ...missing });
    if (Object.keys(nextErrors).length || Object.keys(missing).length) return;
    setErrors({});
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {errors.title && <p className="error-msg">{errors.title}</p>}
      <DynamicForm
        fields={fieldDefs}
        values={customFields}
        onChange={setCustomFields}
        userOptions={userOptions}
        errors={errors}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="issue-title">제목</label>
        <input
          id="issue-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="타입"
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          options={[
            { value: '', label: '(기본)' },
            ...typeOptions.map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
        <SelectField
          label="우선순위"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          options={[
            { value: '', label: '(미지정)' },
            { value: 'high', label: 'high' },
            { value: 'medium', label: 'medium' },
            { value: 'low', label: 'low' },
          ]}
        />
        <SelectField
          label="담당자"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          options={[
            { value: '', label: '(미지정)' },
            ...userOptions.map((o) => ({ value: o.value, label: o.label })),
          ]}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          취소
        </button>
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          생성
        </button>
      </div>
    </form>
  );
}

export default function IssuesListPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [filterField, setFilterField] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);

  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues`);
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

  const userOptions = useMemo(
    () => (members ?? []).map((m) => ({ value: m.userId, label: m.user?.displayName || m.userId })),
    [members],
  );

  const dynamicFilterFields = useMemo(
    () =>
      (fieldDefs || []).filter((f) => {
        const opts = fieldOptions(f);
        return f.fieldType === 'select' && opts.length > 0;
      }),
    [fieldDefs],
  );

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
    for (const [key, val] of Object.entries(filterField)) {
      if (!val) continue;
      list = list.filter((i: any) => (i.customFields?.[key] ?? '') === val);
    }
    return list;
  }, [issues, query, status, filterField]);

  const dynamicColumns = useMemo(
    () =>
      (fieldDefs || []).map((f) => ({
        key: `cf:${f.key}`,
        header: f.labelKo || f.labelEn || f.label,
        sortable: false,
        value: (i: any) => (i.customFields?.[f.key] == null ? null : i.customFields[f.key]),
        render: (i: any) => renderDynamicValue(i.customFields?.[f.key], f),
      })),
    [fieldDefs],
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Issues</h1>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
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
          {dynamicFilterFields.map((f) => (
            <SelectField
              key={f.key}
              label={f.labelKo || f.labelEn || f.label}
              value={filterField[f.key] ?? ''}
              onChange={(e) => setFilterField({ ...filterField, [f.key]: e.target.value })}
              options={[
                { value: '', label: '(전체)' },
                ...fieldOptions(f).map((o) => ({ value: o, label: o })),
              ]}
            />
          ))}
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
            ...dynamicColumns,
            {
              key: 'key',
              header: 'Key',
              sortable: true,
              value: (i: any) => i.key,
            },
            {
              key: 'title',
              header: 'Title',
              sortable: true,
              value: (i: any) => i.title,
            },
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="작업 항목 생성">
        {createOpen && (
          <CreateIssueForm
            fieldDefs={fieldDefs || []}
            userOptions={userOptions}
            onClose={() => setCreateOpen(false)}
            onCreated={(key) => key && navigate(`/spaces/${spaceKey}/issues/${key}`)}
          />
        )}
      </Modal>
    </div>
  );
}
