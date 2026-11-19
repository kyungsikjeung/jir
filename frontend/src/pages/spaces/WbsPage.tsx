import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import Modal, { ConfirmDialog } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';

interface WbsNode {
  id: string;
  key: string;
  title: string;
  parentId: string | null;
  status: string;
  priority: string;
  progressPercent: number;
  estimatedHours: string | number | null;
  dueDate: string | null;
  assigneeId: string | null;
  assignee: { id: string; displayName: string } | null;
  type: { name: string; color?: string | null } | null;
  children: WbsNode[];
}

interface WbsResponse {
  roots: WbsNode[];
  total: number;
  assigned: number;
  estimatedHours: number;
  averageProgress: number;
}

interface Member {
  userId: string;
  roleId: string;
  user?: { id: string; displayName: string; email: string } | null;
  role?: { id: string; name: string } | null;
}

const TYPE_LABEL: Record<string, string> = {
  epic: 'Epic',
  requirement: 'Requirement',
  task: 'Task',
  bug: 'Bug',
  test_case: 'Test',
  page: 'Page',
};

function flatten(nodes: WbsNode[], depth = 0): Array<{ node: WbsNode; depth: number }> {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flatten(node.children ?? [], depth + 1),
  ]);
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ko-KR');
}

export default function WbsPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<WbsNode | null>(null);
  const [createParent, setCreateParent] = useState<WbsNode | null>(null);
  const [childForm, setChildForm] = useState({ title: '', assigneeId: '', dueDate: '' });
  const [deleteTarget, setDeleteTarget] = useState<WbsNode | null>(null);
  const [form, setForm] = useState({
    parentId: '',
    assigneeId: '',
    estimatedHours: '',
    progressPercent: '0',
    dueDate: '',
    status: 'open',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['wbs', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues/wbs`);
      return res.data as WbsResponse;
    },
  });

  const { data: members } = useQuery({
    queryKey: ['members', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/members`);
      return res.data as Member[];
    },
  });

  const rows = useMemo(() => flatten(data?.roots ?? []), [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await apiClient.put(`/api/spaces/${spaceKey}/issues/${editing.key}`, {
        parentId: form.parentId || null,
        assigneeId: form.assigneeId,
        estimatedHours: form.estimatedHours === '' ? undefined : Number(form.estimatedHours),
        progressPercent: Number(form.progressPercent),
        dueDate: form.dueDate || null,
        status: form.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', spaceKey] });
      queryClient.invalidateQueries({ queryKey: ['issues', spaceKey] });
      toast.success('작업 할당을 저장했습니다.');
      setEditing(null);
    },
    onError: () => toast.error('저장하지 못했습니다.'),
  });

  const createChild = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/api/spaces/${spaceKey}/issues`, {
        parentId: createParent?.id,
        title: childForm.title,
        assigneeId: childForm.assigneeId || undefined,
        dueDate: childForm.dueDate || null,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', spaceKey] });
      queryClient.invalidateQueries({ queryKey: ['issues', spaceKey] });
      toast.success('자식 작업을 추가했습니다.');
      setCreateParent(null);
      setChildForm({ title: '', assigneeId: '', dueDate: '' });
    },
    onError: () => toast.error('자식 작업 추가에 실패했습니다.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      await apiClient.delete(`/api/spaces/${spaceKey}/issues/${key}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', spaceKey] });
      queryClient.invalidateQueries({ queryKey: ['issues', spaceKey] });
      toast.success('작업을 삭제했습니다.');
      setDeleteTarget(null);
    },
    onError: () => toast.error('삭제하지 못했습니다.'),
  });

  const openEdit = (node: WbsNode) => {
    setEditing(node);
    setForm({
      parentId: node.parentId ?? '',
      assigneeId: node.assigneeId ?? '',
      estimatedHours: node.estimatedHours != null ? String(node.estimatedHours) : '',
      progressPercent: String(node.progressPercent ?? 0),
      dueDate: node.dueDate ? node.dueDate.slice(0, 10) : '',
      status: node.status ?? 'open',
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate();
  };

  const total = data?.total ?? 0;
  const assigned = data?.assigned ?? 0;
  const estimates = data?.estimatedHours ?? 0;
  const average = data?.averageProgress ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">WBS · 작업 분해</h1>
          <p className="text-sm text-gray-500 mt-1">
            상위 작업과 하위 작업의 계층, 담당자, 예상 공수와 진행률을 관리합니다.
          </p>
        </div>
      </div>

      <section aria-label="WBS 요약" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '전체 작업', value: total, suffix: '개' },
          { label: '담당자 지정', value: assigned, suffix: ` / ${total}` },
          { label: '예상 공수 합계', value: estimates.toFixed(1), suffix: 'h' },
          { label: '평균 진행률', value: average.toFixed(1), suffix: '%' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow p-5">
            <h2 className="text-sm font-medium text-gray-500">{card.label}</h2>
            <p className="text-2xl font-bold mt-1">
              {card.value}
              <span className="text-sm font-normal text-gray-500 ml-1">{card.suffix}</span>
            </p>
          </div>
        ))}
      </section>

      {isLoading ? (
        <p role="status">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">아직 WBS 작업이 없습니다.</p>
          <Link to={`/spaces/${spaceKey}/issues`} className="text-blue-600 hover:underline">
            Issues에서 작업 항목 만들기 →
          </Link>
        </div>
      ) : (
        <div
          role="region"
          aria-label="WBS 작업 트리"
          tabIndex={0}
          className="table-wrapper"
        >
          <table className="jir-table">
            <caption className="visually-hidden">
              WBS 계층 구조. 첫 번째 열의 들여쓰기가 상하 관계를 나타냅니다.
            </caption>
            <thead>
              <tr>
                <th scope="col">WBS</th>
                <th scope="col">유형</th>
                <th scope="col">담당자</th>
                <th scope="col">진행률</th>
                <th scope="col">예상(h)</th>
                <th scope="col">마감일</th>
                <th scope="col">
                  <span className="visually-hidden">작업</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ node, depth }) => (
                <tr key={node.id}>
                  <th scope="row" style={{ minInlineSize: '20rem' }}>
                    <span
                      className="flex items-baseline gap-2"
                      style={{ paddingInlineStart: `${depth * 1.25}rem` }}
                    >
                      {depth > 0 && (
                        <span aria-hidden="true" className="text-gray-300">
                          └
                        </span>
                      )}
                      <Link
                        to={`/spaces/${spaceKey}/issues/${node.key}`}
                        className="font-mono text-xs text-blue-600 hover:underline"
                      >
                        {node.key}
                      </Link>
                      <span className="font-medium">{node.title}</span>
                      <span className="visually-hidden">레벨 {depth + 1}</span>
                    </span>
                  </th>
                  <td data-label="유형">
                    <span className="badge badge-obsolete">
                      {TYPE_LABEL[node.type?.name ?? ''] ?? node.type?.name ?? '—'}
                    </span>
                  </td>
                  <td data-label="담당자">{node.assignee?.displayName ?? '미지정'}</td>
                  <td data-label="진행률">
                    <span className="flex items-center gap-2 min-w-[9rem]">
                      <progress
                        value={node.progressPercent ?? 0}
                        max={100}
                        aria-label={`${node.key} 진행률 ${node.progressPercent ?? 0}%`}
                      >
                        {node.progressPercent ?? 0}%
                      </progress>
                      <span className="text-xs whitespace-nowrap">{node.progressPercent ?? 0}%</span>
                    </span>
                  </td>
                  <td data-label="예상(h)">
                    {node.estimatedHours != null ? Number(node.estimatedHours).toFixed(1) : '—'}
                  </td>
                  <td data-label="마감일">{formatDate(node.dueDate)}</td>
                  <td data-label="작업">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEdit(node)}
                        aria-label={`${node.key} 작업 할당 편집`}
                      >
                        편집
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setChildForm({ title: '', assigneeId: '', dueDate: '' });
                          setCreateParent(node);
                        }}
                        aria-label={`${node.key} 자식 작업 추가`}
                      >
                        자식 추가
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteTarget(node)}
                        aria-label={`${node.key} 삭제`}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.key} 작업 할당` : '작업 할당'}
      >
        {editing && (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="field">
              <label htmlFor="wbs-assignee">담당자</label>
              <select
                id="wbs-assignee"
                value={form.assigneeId}
                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
              >
                <option value="">(미지정)</option>
                {(members ?? []).map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user?.displayName ?? member.userId}
                    {member.role ? ` · ${member.role.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="wbs-parent">상위 작업</label>
              <select
                id="wbs-parent"
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              >
                <option value="">(루트)</option>
                {rows
                  .filter((r) => r.node.id !== editing?.id)
                  .map((r) => (
                    <option key={r.node.id} value={r.node.id}>
                      {r.node.key} · {r.node.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="wbs-estimate">예상 공수(h)</label>
                <input
                  id="wbs-estimate"
                  type="number"
                  min={0}
                  step={0.5}
                  inputMode="decimal"
                  value={form.estimatedHours}
                  onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="wbs-due">마감일</label>
                <input
                  id="wbs-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="wbs-progress">진행률 (%)</label>
              <input
                id="wbs-progress"
                type="number"
                min={0}
                max={100}
                step={5}
                inputMode="numeric"
                value={form.progressPercent}
                onChange={(e) => setForm({ ...form, progressPercent: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="wbs-status">상태</label>
              <select
                id="wbs-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="open">open</option>
                <option value="in_progress">in progress</option>
                <option value="in_review">in review</option>
                <option value="done">done</option>
              </select>
            </div>

            <p className="text-sm text-gray-500">
              현재 상태: <StatusBadge value={editing.status} />
            </p>

            <div className="flex justify-end gap-2 mt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                취소
              </button>
              <button type="submit" className="btn btn-primary" disabled={save.isPending}>
                {save.isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 자식 작업 추가 */}
      <Modal
        open={!!createParent}
        onClose={() => setCreateParent(null)}
        title={`${createParent?.key} · 자식 작업 생성`}
      >
        {createParent && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!childForm.title.trim()) return;
              createChild.mutate();
            }}
            noValidate
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-gray-600">
              부모: <span className="font-medium">{createParent.key}</span> · {createParent.title}
            </p>
            <div className="field">
              <label htmlFor="wbs-child-title">제목</label>
              <input
                id="wbs-child-title"
                type="text"
                required
                value={childForm.title}
                onChange={(e) => setChildForm({ ...childForm, title: e.target.value })}
                placeholder="제목을 입력하세요"
              />
            </div>
            <div className="field">
              <label htmlFor="wbs-child-assignee">담당자</label>
              <select
                id="wbs-child-assignee"
                value={childForm.assigneeId}
                onChange={(e) => setChildForm({ ...childForm, assigneeId: e.target.value })}
              >
                <option value="">(미지정)</option>
                {(members ?? []).map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user?.displayName ?? member.userId}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="wbs-child-due">마감일</label>
              <input
                id="wbs-child-due"
                type="date"
                value={childForm.dueDate}
                onChange={(e) => setChildForm({ ...childForm, dueDate: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCreateParent(null)}
              >
                취소
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createChild.isPending}
              >
                자식 작업 추가
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="작업 삭제"
        message={`${deleteTarget?.key} ${deleteTarget?.title ?? ''}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.key)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
