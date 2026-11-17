import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';

export default function PageDetailPage() {
  const { spaceKey, pageId } = useParams<{ spaceKey: string; pageId: string }>();
  const { data: page, isLoading } = useQuery({
    queryKey: ['page', pageId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/docs/${pageId}`);
      return res.data;
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!page) return <div>Page not found</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold mb-4">{page.title}</h1>
      <div className="prose max-w-none">
        {page.bodyText || 'No content'}
      </div>
      <div className="mt-6 border-t pt-4 text-sm text-gray-500">
        Version {page.version} · Last updated {new Date(page.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}
