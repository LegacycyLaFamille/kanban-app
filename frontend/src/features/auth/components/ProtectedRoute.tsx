import { useState } from "react";

import { Navigate, Outlet, useLocation } from "react-router-dom";

import { ErrorState, LoadingState } from "../../../shared/components/Feedback";

import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute() {
  const location = useLocation();

  const { isAuthenticated, isInitializing, sessionError, refreshUser } =
    useAuth();

  const [isRetrying, setIsRetrying] = useState(false);

  async function retry() {
    setIsRetrying(true);

    await refreshUser().catch(() => undefined);

    setIsRetrying(false);
  }

  if (isInitializing || isRetrying) {
    return <LoadingState label="Loading your session" />;
  }

  if (sessionError) {
    return (
      <ErrorState
        size="screen"
        title="Unable to verify your session"
        message="Check your connection and try again."
        onRetry={() => {
          void retry();
        }}
      />
    );
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
