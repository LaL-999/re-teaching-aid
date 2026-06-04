import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';
import { AppLayout } from './components/AppLayout';
import { AppIndexRedirect } from './components/AppIndexRedirect';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

// /app 下的页面按路由懒加载，缩小首屏包体（命名导出 → 适配 React.lazy 的 default 约定）
const ResourceManagePage = lazy(() =>
  import('./pages/teacher/ResourceManagePage').then((m) => ({ default: m.ResourceManagePage })),
);
const DashboardPage = lazy(() =>
  import('./pages/teacher/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const HomeworkManagePage = lazy(() =>
  import('./pages/teacher/HomeworkManagePage').then((m) => ({ default: m.HomeworkManagePage })),
);
const ResourceBrowsePage = lazy(() =>
  import('./pages/student/ResourceBrowsePage').then((m) => ({ default: m.ResourceBrowsePage })),
);
const HomeworkPage = lazy(() =>
  import('./pages/student/HomeworkPage').then((m) => ({ default: m.HomeworkPage })),
);
const OverviewPage = lazy(() =>
  import('./pages/ai/OverviewPage').then((m) => ({ default: m.OverviewPage })),
);
const InterviewPage = lazy(() =>
  import('./pages/ai/InterviewPage').then((m) => ({ default: m.InterviewPage })),
);
const RequirementsPage = lazy(() =>
  import('./pages/ai/RequirementsPage').then((m) => ({ default: m.RequirementsPage })),
);
const ReviewPage = lazy(() =>
  import('./pages/ai/ReviewPage').then((m) => ({ default: m.ReviewPage })),
);
const IstarPage = lazy(() => import('./pages/ai/IstarPage').then((m) => ({ default: m.IstarPage })));
const UmlPage = lazy(() => import('./pages/ai/UmlPage').then((m) => ({ default: m.UmlPage })));
const SrsPage = lazy(() => import('./pages/ai/SrsPage').then((m) => ({ default: m.SrsPage })));

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      path: '/app',
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <AppIndexRedirect /> },
        {
          path: 'resources',
          element: (
            <RoleGuard role="teacher">
              <ResourceManagePage />
            </RoleGuard>
          ),
        },
        {
          path: 'homework',
          element: (
            <RoleGuard role="teacher">
              <HomeworkManagePage />
            </RoleGuard>
          ),
        },
        {
          path: 'dashboard',
          element: (
            <RoleGuard role="teacher">
              <DashboardPage />
            </RoleGuard>
          ),
        },
        {
          path: 'browse',
          element: (
            <RoleGuard role="student">
              <ResourceBrowsePage />
            </RoleGuard>
          ),
        },
        {
          path: 'my-homework',
          element: (
            <RoleGuard role="student">
              <HomeworkPage />
            </RoleGuard>
          ),
        },
        { path: 'tools/overview', element: <OverviewPage /> },
        { path: 'tools/interview', element: <InterviewPage /> },
        { path: 'tools/requirements', element: <RequirementsPage /> },
        { path: 'tools/review', element: <ReviewPage /> },
        { path: 'tools/istar', element: <IstarPage /> },
        { path: 'tools/uml', element: <UmlPage /> },
        { path: 'tools/srs', element: <SrsPage /> },
      ],
    },
    { path: '/', element: <Navigate to="/app" replace /> },
    { path: '*', element: <NotFoundPage /> },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);
