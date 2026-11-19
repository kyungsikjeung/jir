import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import SpaceLayout from './layouts/SpaceLayout';
import ProtectedRoute from './layouts/ProtectedRoute';

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
import ExportPage from './pages/spaces/ExportPage';
import WbsPage from './pages/spaces/WbsPage';
import ResponsibilityPage from './pages/spaces/ResponsibilityPage';
import ReviewsListPage from './pages/spaces/ReviewsListPage';
import ReviewDetailPage from './pages/spaces/ReviewDetailPage';
import ApprovalsPage from './pages/spaces/ApprovalsPage';
import SignaturesPage from './pages/spaces/SignaturesPage';
import AuditPage from './pages/spaces/AuditPage';
import NotFoundPage from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/spaces" element={<SpacesListPage />} />

              <Route path="/spaces/:spaceKey" element={<SpaceLayout />}>
                <Route index element={<SpaceDashboardPage />} />
                <Route path="issues" element={<IssuesListPage />} />
                <Route path="issues/:issueKey" element={<IssueDetailPage />} />
                <Route path="wbs" element={<WbsPage />} />
                <Route path="rr" element={<ResponsibilityPage />} />
              <Route path="reviews" element={<ReviewsListPage />} />
              <Route path="reviews/:reviewId" element={<ReviewDetailPage />} />
              <Route path="approvals" element={<ApprovalsPage />} />
              <Route path="signatures" element={<SignaturesPage />} />
              <Route path="audit" element={<AuditPage />} />
                <Route path="docs" element={<DocsTreePage />} />
                <Route path="docs/:pageId" element={<PageDetailPage />} />
                <Route path="trace" element={<TraceabilityPage />} />
                <Route path="compliance" element={<CompliancePage />} />
              <Route path="export" element={<ExportPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
