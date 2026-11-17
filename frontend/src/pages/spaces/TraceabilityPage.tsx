import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';

export default function TraceabilityPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const { data: matrix, isLoading } = useQuery({
    queryKey: ['trace', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/trace`);
      return res.data;
    },
  });

  const { data: coverage } = useQuery({
    queryKey: ['coverage', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/trace/coverage`);
      return res.data;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Traceability Matrix</h1>
      {coverage && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Coverage</h2>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-green-600">{coverage.percent?.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">
              {coverage.covered} / {coverage.total} requirements covered
            </div>
          </div>
          {coverage.uncovered?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-red-500">Uncovered: {coverage.uncovered.join(', ')}</p>
            </div>
          )}
        </div>
      )}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Trace Links</h2>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <p className="text-gray-500">Traceability matrix visualization will be rendered here.</p>
        )}
      </div>
    </div>
  );
}
