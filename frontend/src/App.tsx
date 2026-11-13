import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

// Layouts
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import SpaceLayout from './layouts/SpaceLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SpacesListPage from './pages/spaces/SpacesListPage';
import SpaceDashboardPage from './pages/spaces/SpaceDashboardPage';
import IssuesListPage from './pages/spaces/IssuesListPage';
import IssueDetailPage from './pages/spaces/IssueDetailPage';
import DocsTreePage from './pages/spaces/DocsTreePage';
import PageDetailPage from './pages/spaces/PageDetailPage';
import TraceabilityPage from './pages/spaces/TraceabilityPage';
import CompliancePage from './pages/spaces/CompliancePage';
import NotFoundPage from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* App */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/spaces" element={<SpacesListPage />} />

            {/* Space (nested) */}
            <Route path="/spaces/:spaceKey" element={<SpaceLayout />}>
              <Route index element={<SpaceDashboardPage />} />
              <Route path="issues" element={<IssuesListPage />} />
              <Route path="issues/:issueKey" element={<IssueDetailPage />} />
              <Route path="docs" element={<DocsTreePage />} />
              <Route path="docs/:pageId" element={<PageDetailPage />} />
              <Route path="trace" element={<TraceabilityPage />} />
              <Route path="compliance" element={<CompliancePage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
