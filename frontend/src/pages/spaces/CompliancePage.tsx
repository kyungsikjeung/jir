import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';

export default function CompliancePage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const { data: compliance, isLoading } = useQuery({
    queryKey: ['compliance', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/compliance`);
      return res.data;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ASPICE Compliance</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Process</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {compliance?.map((proc: any) => (
                <tr key={proc.processCode} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{proc.processCode}</td>
                  <td className="px-6 py-4">{proc.processName}</td>
                  <td className="px-6 py-4 text-sm">{proc.totalItems}</td>
                  <td className="px-6 py-4 text-sm">{proc.completedItems}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${proc.completionPercent}%` }} />
                      </div>
                      <span className="text-sm">{proc.completionPercent?.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
