import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ApiError } from "../../../shared/api";

import { getCurrentUser, login, logout } from "../api/auth.api";

import type { AuthUser, LoginPayload } from "../types/auth.types";

import { AuthContext, type AuthContextValue } from "./AuthContext";

interface AuthProviderProps {
  children: ReactNode;
}

function isAuthenticationError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);

  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((currentUser) => {
        if (cancelled) {
          return;
        }

        setUser(currentUser);
        setSessionError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setUser(null);

        if (isAuthenticationError(error)) {
          setSessionError(null);

          return;
        }

        setSessionError("Unable to verify your session.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsInitializing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();

      setUser(currentUser);
      setSessionError(null);
    } catch (error) {
      setUser(null);

      if (isAuthenticationError(error)) {
        setSessionError(null);

        return;
      }

      setSessionError("Unable to verify your session.");

      throw error;
    }
  }, []);

  const signIn = useCallback(async (payload: LoginPayload) => {
    await login(payload);

    const currentUser = await getCurrentUser();

    setUser(currentUser);
    setSessionError(null);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setSessionError(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,

      isAuthenticated: user !== null,
      isInitializing,

      sessionError,

      signIn,
      signOut,
      refreshUser,
    }),
    [user, isInitializing, sessionError, signIn, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
