import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 p-4">
        <h1 className="text-xl font-bold mb-6">ASPICE ALM</h1>
        <nav className="space-y-2">
          <Link to="/" className="block px-3 py-2 rounded hover:bg-gray-100">Dashboard</Link>
          <Link to="/spaces" className="block px-3 py-2 rounded hover:bg-gray-100">Spaces</Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
