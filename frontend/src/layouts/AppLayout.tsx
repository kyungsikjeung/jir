import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import NavDrawer from '../components/NavDrawer';

const NAV = [
  { to: '/', label: '대시보드', end: true },
  { to: '/spaces', label: '스페이스', end: false },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = localStorage.getItem('email') || 'user';
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 모바일 드로어에서 페이지를 이동하면 자동으로 닫기
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('email');
    navigate('/login');
  };

  const navLinks = (
    <ul className="space-y-1" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {NAV.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `nav-link ${isActive ? '' : ''}`
            }
            style={({ isActive }) =>
              isActive
                ? { background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', fontWeight: 600 }
                : undefined
            }
            aria-label={item.label}
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="app-shell">
      {/* 데스크톱 사이드바 */}
      <aside className="app-sidebar bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <Link to="/" className="text-xl font-bold tracking-tight" aria-label="jir 홈">
            jir<span className="text-blue-600">.</span>
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">ASPICE ALM</p>
        </div>
        <nav className="flex-1 p-3" aria-label="주요 내비게이션">
          {navLinks}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2 truncate" title={email}>
            {email}
          </div>
          <button type="button" onClick={logout} className="btn btn-secondary btn-sm w-full">
            로그아웃
          </button>
        </div>
      </aside>

      {/* 모바일 헤더 + 드로어 */}
      <header className="app-header">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          aria-label="메뉴 열기"
          aria-expanded={drawerOpen}
          aria-controls="app-drawer"
          onClick={() => setDrawerOpen(true)}
        >
          ☰
        </button>
        <Link to="/" className="text-lg font-bold tracking-tight">
          jir<span className="text-blue-600">.</span>
        </Link>
      </header>
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} label="주요 메뉴">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-lg font-bold">
            jir<span className="text-blue-600">.</span>
          </span>
          <button
            type="button"
            autoFocus
            aria-label="메뉴 닫기"
            className="btn btn-secondary btn-sm"
            onClick={() => setDrawerOpen(false)}
          >
            닫기
          </button>
        </div>
        <div className="p-3">
          {navLinks}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-2 truncate" title={email}>
              {email}
            </div>
            <button type="button" onClick={logout} className="btn btn-secondary btn-sm w-full">
              로그아웃
            </button>
          </div>
        </div>
      </NavDrawer>

      <main className="app-main p-6" id="main">
        <Outlet />
      </main>
    </div>
  );
}
