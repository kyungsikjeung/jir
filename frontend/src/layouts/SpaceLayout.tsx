import { useParams, Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api.client';

export default function SpaceLayout() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const { data: space, isLoading } = useQuery({
    queryKey: ['space', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/spaces/${spaceKey}`);
      return res.data;
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-full">Loading...</div>;
  if (!space) return <div>Space not found</div>;

  return (
    <div className="flex h-full">
      <aside className="w-56 bg-white border-r border-gray-200 p-4">
        <h2 className="font-bold mb-4">{space.name}</h2>
        <nav className="space-y-1">
          <Link to={`/spaces/${spaceKey}`} className="block px-3 py-2 rounded hover:bg-gray-100 text-sm">Dashboard</Link>
          <Link to={`/spaces/${spaceKey}/issues`} className="block px-3 py-2 rounded hover:bg-gray-100 text-sm">Issues</Link>
          <Link to={`/spaces/${spaceKey}/docs`} className="block px-3 py-2 rounded hover:bg-gray-100 text-sm">Docs</Link>
          <Link to={`/spaces/${spaceKey}/trace`} className="block px-3 py-2 rounded hover:bg-gray-100 text-sm">Traceability</Link>
          <Link to={`/spaces/${spaceKey}/compliance`} className="block px-3 py-2 rounded hover:bg-gray-100 text-sm">Compliance</Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
