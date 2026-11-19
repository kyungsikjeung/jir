import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import Modal from '../../components/Modal';

interface Role {
  id: string;
  name: string;
  description?: string | null;
  members: Array<{ id: string; displayName: string }>;
}

interface Cell {
  id: string;
  roleId: string;
  aspiceProcess: string;
  responsibility: string;
  isPrimary: boolean;
}

interface Matrix {
  processes: Array<{ code: string; name: string; category?: string | null }>;
  roles: Role[];
  cells: Cell[];
}

const RESPONSIBILITIES = [
  { value: 'owner', label: '주 담당 (Owner)', badge: 'badge-open' },
  { value: 'contributor', label: '기여 (Contributor)', badge: 'badge-medium' },
  { value: 'reviewer', label: '리뷰 (Reviewer)', badge: 'badge-in-review' },
  { value: 'approver', label: '승인 (Approver)', badge: 'badge-approved' },
  { value: 'viewer', label: '열람 (Viewer)', badge: 'badge-obsolete' },
] as const;

const LABEL: Record<string, string> = {
  owner: 'Owner',
  contributor: 'Contributor',
  reviewer: 'Reviewer',
  approver: 'Approver',
  viewer: 'Viewer',
};

const BADGE: Record<string, string> = {
  owner: 'badge-open',
  contributor: 'badge-medium',
  reviewer: 'badge-in-review',
  approver: 'badge-approved',
  viewer: 'badge-obsolete',
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: '슈퍼 관리자',
  org_admin: '조직 관리자',
  project_admin: '프로젝트 관리자',
  developer: '개발자',
  tester: '테스터',
  reviewer: '리뷰어',
  viewer: '뷰어',
  external_stakeholder: '외부 이해관계자',
};

const roleLabel = (role: Role) =>
  ROLE_LABEL[role.name] ?? role.description?.replace(/\s*\(.+\)$/, '') ?? role.name;

interface AssignmentRow {
  id: string;
  roleId: string;
  userId: string;
  user: { id: string; displayName: string; email: string } | null;
  isPrimary: boolean;
  aspiceProcess: string | null;
}

interface AssignTarget {
  roleId: string;
  roleName: string;
  roleMembers: Array<{ id: string; displayName: string }>;
}

export default function ResponsibilityPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<{ processCode: string; roleId: string } | null>(null);
  const [responsibility, setResponsibility] = useState('contributor');
  const [isPrimary, setIsPrimary] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [newMemberId, setNewMemberId] = useState('');
  const [assignPrimary, setAssignPrimary] = useState(false);

  const { data: matrix, isLoading } = useQuery({
    queryKey: ['rr', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/rr`);
      return res.data as Matrix;
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ['rr-assignments', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/rr/assignments`);
      return res.data as AssignmentRow[];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/spaces/${spaceKey}/rr/assignments`, {
        roleId: assignTarget?.roleId,
        userId: newMemberId,
        isPrimary: assignPrimary,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rr-assignments', spaceKey] });
      toast.success('멤버를 할당했습니다.');
      setAssignTarget(null);
      setNewMemberId('');
      setAssignPrimary(false);
    },
    onError: () => toast.error('할당에 실패했습니다.'),
  });

  const unassignMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/spaces/${spaceKey}/rr/assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rr-assignments', spaceKey] });
      toast.success('해제했습니다.');
    },
    onError: () => toast.error('해제하지 못했습니다.'),
  });

  const cellFor = (processCode: string, roleId: string) =>
    matrix?.cells.find((c) => c.aspiceProcess === processCode && c.roleId === roleId);

  const selectedCell = selection
    ? cellFor(selection.processCode, selection.roleId)
    : undefined;
  const selectedRole = matrix?.roles.find((r) => r.id === selection?.roleId);
  const selectedProcess = matrix?.processes.find((p) => p.code === selection?.processCode);

  const openCell = (processCode: string, roleId: string) => {
    const existing = cellFor(processCode, roleId);
    setSelection({ processCode, roleId });
    setResponsibility(existing?.responsibility ?? 'contributor');
    setIsPrimary(existing?.isPrimary ?? false);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!selection) return;
      await apiClient.post(`/api/spaces/${spaceKey}/rr`, {
        roleId: selection.roleId,
        aspiceProcess: selection.processCode,
        responsibility,
        isPrimary,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rr', spaceKey] });
      toast.success('R&R 책임을 저장했습니다.');
      setSelection(null);
    },
    onError: () => toast.error('저장하지 못했습니다.'),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!selectedCell) return;
      await apiClient.delete(`/api/spaces/${spaceKey}/rr/${selectedCell.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rr', spaceKey] });
      toast.success('R&R 책임을 삭제했습니다.');
      setSelection(null);
    },
    onError: () => toast.error('삭제하지 못했습니다.'),
  });

  const processCount = matrix?.processes.length ?? 0;
  const covered = matrix
    ? matrix.processes.filter((p) =>
        matrix.cells.some((c) => c.aspiceProcess === p.code && c.responsibility === 'owner'),
      ).length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">R&amp;R 매트릭스</h1>
        <p className="text-sm text-gray-500 mt-1">
          ASPICE 프로세스별 역할 책임(Owner·Contributor·Reviewer·Approver·Viewer)을 정의합니다.
          셀을 눌러 변경할 수 있습니다.
        </p>
      </div>

      <section aria-label="R&R 요약" className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-medium text-gray-500">적용 프로세스</h2>
          <p className="text-2xl font-bold mt-1">{processCount}개</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-medium text-gray-500">Owner 지정</h2>
          <p className="text-2xl font-bold mt-1 text-green-600">
            {covered} / {processCount}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-medium text-gray-500">참여 역할</h2>
          <p className="text-2xl font-bold mt-1">{matrix?.roles.length ?? 0}개</p>
        </div>
      </section>

      {isLoading ? (
        <p role="status">Loading...</p>
      ) : !matrix || matrix.roles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">
            스페이스에 멤버와 역할이 없습니다. 먼저 멤버를 추가해 주세요.
          </p>
        </div>
      ) : (
        <>
          <div
            role="region"
            aria-label="ASPICE 프로세스 역할 책임 매트릭스"
            tabIndex={0}
            className="table-wrapper"
          >
            <table className="jir-table matrix-table table-static">
              <caption className="visually-hidden">
                행은 ASPICE 프로세스, 열은 역할입니다. 각 셀의 값은 해당 역할의 책임 수준입니다.
              </caption>
              <thead>
                <tr>
                  <th scope="col">프로세스</th>
                  {matrix.roles.map((role) => (
                    <th key={role.id} scope="col" style={{ minInlineSize: '9rem' }}>
                      <span className="block">{roleLabel(role)}</span>
                      <span className="block text-xs font-normal text-gray-500">
                        {role.members.map((m) => m.displayName).join(', ') || '멤버 없음'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.processes.map((process) => (
                  <tr key={process.code}>
                    <th scope="row">
                      <span className="font-mono text-xs text-blue-600">{process.code}</span>
                      <span className="block text-sm">{process.name}</span>
                    </th>
                    {matrix.roles.map((role) => {
                      const cell = cellFor(process.code, role.id);
                      const label = cell ? LABEL[cell.responsibility] ?? cell.responsibility : null;
                      return (
                        <td key={role.id} data-label={role.name}>
                          <button
                            type="button"
                            className="matrix-cell"
                            onClick={() => openCell(process.code, role.id)}
                            aria-label={`${process.code} · ${roleLabel(role)} 책임 ${
                              label ?? '미지정'
                            } — 변경`}
                          >
                            {cell ? (
                              <span className={`badge ${BADGE[cell.responsibility] ?? 'badge-obsolete'}`}>
                                {label}
                                {cell.isPrimary ? ' ★' : ''}
                              </span>
                            ) : (
                              <span className="text-gray-300" aria-hidden="true">
                                ＋ 지정
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-wrap gap-3 text-sm text-gray-600" style={{ listStyle: 'none', padding: 0 }}>
            {RESPONSIBILITIES.map((item) => (
              <li key={item.value} className="flex items-center gap-1.5">
                <span className={`badge ${item.badge}`}>{LABEL[item.value]}</span>
                {item.label.replace(/ \(.+\)$/, '')}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true">★</span> 주 책임자
            </li>
          </ul>
        </>
      )}

      <section aria-label="멤버 할당" className="bg-white rounded-lg shadow p-5">
        <h2 className="text-lg font-semibold mb-3">멤버 할당</h2>
        {matrix?.roles.map((role) => {
          const assigned = (assignments ?? []).filter((a) => a.roleId === role.id);
          return (
            <div key={role.id} className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{roleLabel(role)}</h3>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {assigned.map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs"
                  >
                    <span>{a.user?.displayName ?? a.userId}</span>
                    {a.isPrimary && <span title="주 담당자">★</span>}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => unassignMutation.mutate(a.id)}
                      disabled={unassignMutation.isPending}
                    >
                      해제
                    </button>
                  </span>
                ))}
                {assigned.length === 0 && (
                  <span className="text-xs text-gray-400">할당된 멤버가 없습니다.</span>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setAssignTarget({
                      roleId: role.id,
                      roleName: roleLabel(role),
                      roleMembers: role.members,
                    });
                    setNewMemberId(role.members[0]?.id ?? '');
                    setAssignPrimary(false);
                  }}
                >
                  멤버 추가
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <Modal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title={`${assignTarget?.roleName ?? ''} · 멤버 할당`}
      >
        {assignTarget && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (newMemberId) assignMutation.mutate();
            }}
          >
            <div className="field">
              <label htmlFor="rr-assign-member">할당 멤버</label>
              <select
                id="rr-assign-member"
                value={newMemberId}
                onChange={(e) => setNewMemberId(e.target.value)}
                required
              >
                <option value="">(선택)</option>
                {assignTarget.roleMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={assignPrimary}
                onChange={(e) => setAssignPrimary(e.target.checked)}
                style={{ inlineSize: '1.1rem', blockSize: '1.1rem' }}
              />
              주 담당자로 지정
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setAssignTarget(null)}>
                취소
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newMemberId || assignMutation.isPending}
              >
                할당
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!selection}
        onClose={() => setSelection(null)}
        title={
          selectedProcess && selectedRole
            ? `${selectedProcess.code} · ${roleLabel(selectedRole)}`
            : 'R&R 책임'
        }
      >
        {selection && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="field">
              <label htmlFor="rr-responsibility">책임 수준</label>
              <select
                id="rr-responsibility"
                value={responsibility}
                onChange={(e) => setResponsibility(e.target.value)}
              >
                {RESPONSIBILITIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                style={{ inlineSize: '1.1rem', blockSize: '1.1rem' }}
              />
              주 책임자로 지정
            </label>

            <div className="flex flex-wrap justify-end gap-2 mt-2">
              {selectedCell && (
                <button
                  type="button"
                  className="btn btn-danger mr-auto"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  삭제
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setSelection(null)}>
                취소
              </button>
              <button type="submit" className="btn btn-primary" disabled={save.isPending}>
                {save.isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
