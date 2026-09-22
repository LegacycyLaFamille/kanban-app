import { createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";

import { ProjectDetailsPage } from "../features/projects/pages/ProjectDetailsPage";
import { ProjectsPage } from "../features/projects/pages/ProjectsPage";

import { WaitTemplate } from "../shared/components/WaitTemplate";

import { LegacyApp } from "./legacy/LegacyApp";
import { MainLayout } from "./layouts/MainLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LegacyApp />,
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

            element: <WaitTemplate template="KANBAN" />,
          },

          {
            path: "/profile",
            element: <WaitTemplate template="PROFILE" />,
          },

          {
            path: "/tasks",
            element: <WaitTemplate template="TASKS" />,
          },

          {
            path: "/notifications",
            element: <WaitTemplate template="NOTIFICATIONS" />,
          },
        ],
      },
    ],
  },
]);
