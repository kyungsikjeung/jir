import { useParams, Outlet, NavLink, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api.client';

const TABS = [
  { to: '', label: '대시보드', end: true },
  { to: 'issues', label: 'Issues', end: false },
  { to: 'wbs', label: 'WBS', end: false },
  { to: 'rr', label: 'R&R', end: false },
  { to: 'docs', label: 'Docs', end: false },
  { to: 'reviews', label: 'Reviews', end: false },
  { to: 'approvals', label: 'Approvals', end: false },
  { to: 'signatures', label: '전자서명', end: false },
  { to: 'trace', label: 'Traceability', end: false },
  { to: 'compliance', label: 'Compliance', end: false },
  { to: 'export', label: 'Export', end: false },
];

export default function SpaceLayout() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const { data: space, isLoading } = useQuery({
    queryKey: ['space', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p role="status">Loading...</p>
      </div>
    );
  }
  if (!space) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-xl font-bold mb-2">Space not found</h1>
        <p className="text-gray-500 mb-4">요청한 스페이스를 찾을 수 없습니다.</p>
        <Link to="/spaces" className="text-blue-600 hover:underline">
          스페이스 목록으로 →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="mb-6">
        <nav aria-label="스페이스" className="text-sm text-gray-500 mb-2">
          <Link to="/spaces" className="hover:underline">
            Spaces
          </Link>{' '}
          / <span aria-current="page" className="text-gray-800 font-medium">{space.key}</span>
        </nav>
        <h1 className="text-2xl font-bold">{space.name}</h1>
        {space.description && <p className="text-sm text-gray-500 mt-1">{space.description}</p>}
      </header>

      {/* 페이지 네비게이션 — tabs 가이드: 페이지 이동은 tablist 패턴 미사용 */}
      <nav aria-label="스페이스 섹션" className="space-nav mb-6">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to ? `/spaces/${spaceKey}/${tab.to}` : `/spaces/${spaceKey}`}
            end={tab.end}
            className={({ isActive }) => `space-nav-link${isActive ? ' is-active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
