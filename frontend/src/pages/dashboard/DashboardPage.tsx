import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api.client';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { data: spaces, isLoading } = useQuery({
    queryKey: ['spaces'],
    queryFn: async () => {
      const res = await apiClient.get('/api/spaces');
      return res.data;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          spaces?.map((space: any) => (
            <Link key={space.id} to={`/spaces/${space.key}`} className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition">
              <h2 className="text-lg font-semibold">{space.name}</h2>
              <p className="text-sm text-gray-500">{space.key}</p>
              <p className="text-sm text-gray-400 mt-2">{space.description}</p>
            </Link>
          ))
        )}
      </div>
      <div className="mt-6">
        <Link to="/spaces" className="text-blue-600 hover:underline">View all spaces →</Link>
      </div>
    </div>
  );
}
