import { createBrowserRouter } from "react-router-dom";

import { AppProviders } from "./providers/AppProviders";
import { LegacyApp } from "./legacy/LegacyApp";
import { LoginPage } from "../features/auth/pages/LoginPage.tsx";
import { WaitTemplate } from "../shared/components/WaitTemplate.tsx";
import { MainLayout } from "./layouts/MainLayout.tsx";
import { ProjectsPage } from "../features/projects/pages/ProjectsPage.tsx";
import { ProjectDetailsPage } from "../features/projects/pages/ProjectDetailsPage";

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <LegacyApp />,
      },
      {
        path: "/login",
        element: (
          <AppProviders>
            <LoginPage />
          </AppProviders>
        ),
      },
      {
        path: "/register",
        element: (
          <AppProviders>
            <WaitTemplate template="REGISTER" />
          </AppProviders>
        ),
      },
      {
        path: "/projects",
        element: (
          <AppProviders>
            <ProjectsPage />
          </AppProviders>
        ),
      },
      {
        path: "/projects/:projectId",
        element: <ProjectDetailsPage />,
      },
      {
        path: "/project/:projectId/kanban",
        element: (
          <AppProviders>
            <WaitTemplate template="KANBAN" />
          </AppProviders>
        ),
      },
      {
        path: "/profile",
        element: (
          <AppProviders>
            <WaitTemplate template="PROFILE" />
          </AppProviders>
        ),
      },
      {
        path: "/tasks",
        element: (
          <AppProviders>
            <WaitTemplate template="TASKS" />
          </AppProviders>
        ),
      },
      {
        path: "/notifications",
        element: (
          <AppProviders>
            <WaitTemplate template="TASKS" />
          </AppProviders>
        ),
      },
    ],
  },
]);
