import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api.client';
import { Link } from 'react-router-dom';

export default function SpaceDashboardPage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();

  const { data: coverage } = useQuery({
    queryKey: ['coverage', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/trace/coverage`);
      return res.data as { total: number; covered: number; percent: number; uncovered: string[] };
    },
  });

  const { data: compliance } = useQuery({
    queryKey: ['compliance', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/compliance`);
      return res.data as Array<{ processCode: string; completionPercent: number }>;
    },
  });

  const { data: issues } = useQuery({
    queryKey: ['issues', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/issues`);
      return res.data as Array<{ status: string; priority?: string }>;
    },
  });

  const openIssues = issues?.filter((i) => i.status === 'open').length ?? 0;
  const avgCompliance = compliance?.length
    ? compliance.reduce((s, c) => s + (c.completionPercent || 0), 0) / compliance.length
    : 0;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">요약</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ listStyle: 'none', padding: 0 }}>
        <li className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">전체 작업</h3>
          <p className="text-3xl font-bold text-blue-600 mt-1">{issues?.length ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">모든 이슈</p>
        </li>
        <li className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">열린 작업</h3>
          <p className="text-3xl font-bold text-orange-600 mt-1">{openIssues}</p>
          <p className="text-sm text-gray-500 mt-1">진행 중</p>
        </li>
        <li className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">요구사항 커버리지</h3>
          <p className="text-3xl font-bold text-green-600 mt-1">{coverage?.percent ?? 0}%</p>
          <p className="text-sm text-gray-500 mt-1">
            {coverage ? `${coverage.covered} / ${coverage.total}` : '—'}
          </p>
        </li>
        <li className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">ASPICE 컴플라이언스</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{avgCompliance.toFixed(0)}%</p>
          <p className="text-sm text-gray-500 mt-1">프로세스 평균</p>
        </li>
      </ul>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white p-6 rounded-lg shadow" aria-labelledby="quick-trace">
          <h2 id="quick-trace" className="text-lg font-semibold mb-3">추적성</h2>
          <p className="text-sm text-gray-600 mb-3">
            {coverage && coverage.uncovered.length > 0
              ? `미커버 요구사항: ${coverage.uncovered.join(', ')}`
              : '모든 요구사항이 커버됩니다.'}
          </p>
          <Link to={`/spaces/${spaceKey}/trace`} className="btn btn-secondary btn-sm">
            추적성 매트릭스 보기
          </Link>
        </section>
        <section className="bg-white p-6 rounded-lg shadow" aria-labelledby="quick-compliance">
          <h2 id="quick-compliance" className="text-lg font-semibold mb-3">컴플라이언스</h2>
          <p className="text-sm text-gray-600 mb-3">
            {compliance ? `${compliance.length}개 프로세스 적용 중` : '로딩 중…'}
          </p>
          <Link to={`/spaces/${spaceKey}/compliance`} className="btn btn-secondary btn-sm">
            컴플라이언스 현황
          </Link>
        </section>
      </div>
    </div>
  );
}
