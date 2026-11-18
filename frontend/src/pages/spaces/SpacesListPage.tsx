import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';
import DataTable from '../../components/DataTable';
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
        <button type="button" className="btn btn-primary">
          New Space
        </button>
      </div>

      {isLoading ? (
        <p role="status">Loading...</p>
      ) : (
        <DataTable
          caption="프로젝트 스페이스 목록"
          rowKey={(s: any) => s.id}
          columns={[
            {
              key: 'key',
              header: 'Key',
              sortable: true,
              render: (s: any) => (
                <Link to={`/spaces/${s.key}`} className="text-blue-600 hover:underline font-medium">
                  {s.key}
                </Link>
              ),
            },
            { key: 'name', header: 'Name', sortable: true, value: (s: any) => s.name },
            { key: 'spaceType', header: 'Type', value: (s: any) => s.spaceType || '—' },
            { key: 'aspiceLevel', header: 'ASPICE', value: (s: any) => s.aspiceLevel || '—' },
          ]}
          rows={spaces || []}
          rowHeader={(s: any) => s.key}
          emptyText="스페이스가 없습니다. New Space로 생성하세요."
        />
      )}
    </div>
  );
}
