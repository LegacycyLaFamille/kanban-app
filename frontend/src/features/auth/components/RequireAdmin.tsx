import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

/**
 * Route guard for admin-only pages. Must be nested inside ProtectedRoute
 * (it assumes the user is already authenticated); redirects a non-admin to
 * /projects rather than /login, since the user IS signed in — they just
 * don't have the ADMIN role.
 */
export function RequireAdmin() {
  const { user, isInitializing } = useAuth();

  if (isInitializing) {
    return <div role="status">Loading session...</div>;
  }

  if (user?.role !== "ADMIN") {
    return <Navigate to="/projects" replace />;
  }

  return <Outlet />;
}
