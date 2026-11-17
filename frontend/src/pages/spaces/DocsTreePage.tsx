import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';
import { Link } from 'react-router-dom';

export default function DocsTreePage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const { data: pages, isLoading } = useQuery({
    queryKey: ['docs', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/docs`);
      return res.data;
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">New Page</button>
      </div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow p-4">
          {pages?.length === 0 ? (
            <p className="text-gray-500">No documents yet. Create your first page.</p>
          ) : (
            <ul className="space-y-2">
              {pages?.map((page: any) => (
                <li key={page.id}>
                  <Link to={`/spaces/${spaceKey}/docs/${page.id}`} className="text-blue-600 hover:underline">
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
