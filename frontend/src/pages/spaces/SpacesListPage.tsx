import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api.client';
import { Link } from 'react-router-dom';

export default function SpacesListPage() {
  const { data: spaces, isLoading } = useQuery({
    queryKey: ['spaces'],
    queryFn: async () => {
      const res = await apiClient.get('/api/spaces');
      return res.data;
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Spaces</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">New Space</button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ASPICE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : (
              spaces?.map((space: any) => (
                <tr key={space.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/spaces/${space.key}`} className="text-blue-600 hover:underline font-medium">{space.key}</Link>
                  </td>
                  <td className="px-6 py-4">{space.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{space.spaceType}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">Level {space.aspiceLevel}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
