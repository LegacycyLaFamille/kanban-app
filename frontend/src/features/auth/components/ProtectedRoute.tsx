import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute() {
  const location = useLocation();

  const { isAuthenticated, isInitializing, sessionError } = useAuth();

  if (isInitializing) {
    return <div role="status">Loading session...</div>;
  }

  if (sessionError) {
    return <div role="alert">{sessionError}</div>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  return <Outlet />;
}
