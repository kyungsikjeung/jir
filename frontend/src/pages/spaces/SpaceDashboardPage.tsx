import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';

export default function SpaceDashboardPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const { data: space } = useQuery({
    queryKey: ['space', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}`);
      return res.data;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{space?.name} Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Issues</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-500">Open issues</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Coverage</h3>
          <p className="text-3xl font-bold text-green-600">0%</p>
          <p className="text-sm text-gray-500">Requirement coverage</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Compliance</h3>
          <p className="text-3xl font-bold text-orange-600">0%</p>
          <p className="text-sm text-gray-500">ASPICE Level 2</p>
        </div>
      </div>
    </div>
  );
}
