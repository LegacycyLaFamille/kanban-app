import { createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { RequireAdmin } from "../features/auth/components/RequireAdmin";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";

import { ProjectDetailsPage } from "../features/projects/pages/ProjectDetailsPage";
import { ProjectsPage } from "../features/projects/pages/ProjectsPage";

import { ProfilePage } from "../features/profile/pages/ProfilePage";

import { AdminDashboardPage } from "../features/admin/pages/AdminDashboardPage";

import { MyTasksPage } from "../features/tasks/pages/MyTasksPage";

import { NotificationsPage } from "../features/notifications/pages/NotificationsPage";

import { LegalNoticePage } from "../features/legal/pages/LegalNoticePage";
import { PrivacyPolicyPage } from "../features/legal/pages/PrivacyPolicyPage";

import { LegacyApp } from "./legacy/LegacyApp";
import { MainLayout } from "./layouts/MainLayout";
import { KanbanPage } from "../features/kanban/pages/KanbanPage.tsx";
import NotFound from "../features/errors/NotFound/NotFound.tsx";
import Forbidden from "../features/errors/Forbidden/Forbidden.tsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LegacyApp />,
    errorElement: <NotFound />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/privacy",
    element: <PrivacyPolicyPage />,
  },
  {
    path: "/legal-notice",
    element: <LegalNoticePage />,
  },
  {
    path: "/403",
    element: <Forbidden />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "/projects",
            element: <ProjectsPage />,
          },
          {
            path: "/projects/:projectId",
            element: <ProjectDetailsPage />,
          },
          {
            path: "/projects/:projectId/kanban",
            element: <KanbanPage />,
          },
          {
            path: "/profile",
            element: <ProfilePage />,
          },
          {
            path: "/tasks",
            element: <MyTasksPage />,
          },
          {
            path: "/notifications",
            element: <NotificationsPage />,
          },
          {
            element: <RequireAdmin />,
            children: [
              {
                path: "/admin/dashboard",
                element: <AdminDashboardPage />,
              },
            ],
          },
        ],
      },
    ],
  },
]);
