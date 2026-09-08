import { createBrowserRouter } from "react-router-dom";

import { AppProviders } from "./providers/AppProviders";
import { LegacyApp } from "./legacy/LegacyApp";
import { LoginPage } from "../features/auth/pages/LoginPage.tsx";

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
    },
    {
        path: "/projects",
    },
    {
        path: "/project/:projectId/kanban",
    },
    {
        path: "/profile",
    },
]);