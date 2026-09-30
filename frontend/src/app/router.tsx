import { createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { RequireAdmin } from "../features/auth/components/RequireAdmin";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";

import { ProjectDetailsPage } from "../features/projects/pages/ProjectDetailsPage";
import { ProjectsPage } from "../features/projects/pages/ProjectsPage";

import { ProfilePage } from "../features/profile/pages/ProfilePage";

import { AdminDashboardPage } from "../features/admin/pages/AdminDashboardPage";

import { WaitTemplate } from "../shared/components/WaitTemplate";

import { LegacyApp } from "./legacy/LegacyApp";
import { MainLayout } from "./layouts/MainLayout";
import { KanbanPage } from "../features/kanban/pages/KanbanPage.tsx";
import NotFound from "../features/errors/NotFound/NotFound.tsx";
import Forbidden from "../features/errors/Forbidden/Forbidden.tsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LegacyApp />,
    errorElement: <NotFound />
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
            element: <WaitTemplate template="TASKS" />,
          },
          {
            path: "/notifications",
            element: <WaitTemplate template="NOTIFICATIONS" />,
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
