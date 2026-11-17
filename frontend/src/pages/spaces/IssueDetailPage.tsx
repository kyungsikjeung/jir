import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';

export default function IssueDetailPage() {
  const { spaceKey, issueKey } = useParams<{ spaceKey: string; issueKey: string }>();
  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', issueKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues/${issueKey}`);
      return res.data;
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!issue) return <div>Issue not found</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-sm text-gray-500">{issue.key}</span>
          <h1 className="text-2xl font-bold">{issue.title}</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${issue.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {issue.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500">Priority</p>
          <p className="font-medium">{issue.priority}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Assignee</p>
          <p className="font-medium">{issue.assigneeId || 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Reporter</p>
          <p className="font-medium">{issue.reporterId}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Created</p>
          <p className="font-medium">{new Date(issue.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      {issue.description && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Description</h3>
          <p className="text-gray-700">{issue.description}</p>
        </div>
      )}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-2">Comments</h3>
        <p className="text-gray-500 text-sm">No comments yet</p>
      </div>
    </div>
  );
}
