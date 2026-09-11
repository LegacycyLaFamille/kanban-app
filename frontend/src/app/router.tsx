import { createBrowserRouter } from "react-router-dom";

import { AppProviders } from "./providers/AppProviders";
import { LegacyApp } from "./legacy/LegacyApp";
import { LoginPage } from "../features/auth/pages/LoginPage.tsx";
import { WaitTemplate } from "../shared/components/WaitTemplate.tsx";
import { KanbanPage } from "../features/kanban/KanbanPage.tsx";

export const router = createBrowserRouter([
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
        <WaitTemplate template="PROJECTS" />
      </AppProviders>
    ),
  },
  {
    path: "/project/:projectId/kanban",
    element: (
      <AppProviders>
        <KanbanPage />
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
]);
