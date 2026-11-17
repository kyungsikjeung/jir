import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';

export default function IssuesListPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues`);
      return res.data;
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Issues</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Issue</button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : (
              issues?.map((issue: any) => (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/spaces/${spaceKey}/issues/${issue.key}`} className="text-blue-600 hover:underline font-medium">{issue.key}</Link>
                  </td>
                  <td className="px-6 py-4">{issue.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${issue.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{issue.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{issue.priority}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{issue.assigneeId || 'Unassigned'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
