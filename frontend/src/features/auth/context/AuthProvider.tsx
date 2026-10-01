import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ApiError, setSessionExpiredHandler } from "../../../shared/api";

import {
  deleteCurrentUser,
  getCurrentUser,
  login,
  logout,
} from "../api/auth.api";

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

  const clearSession = useCallback(() => {
    setUser(null);
    setSessionError(null);
  }, []);

  // Single subscriber to httpClient's centralized 401 handling: any
  // authenticated request anywhere in the app that gets a 401 surviving a
  // refresh attempt ends up here, so auth state never drifts from the (now
  // dead) backend session without every feature needing its own logic for it.
  useEffect(() => {
    setSessionExpiredHandler(clearSession);

    return () => {
      setSessionExpiredHandler(null);
    };
  }, [clearSession]);

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

        if (isAuthenticationError(error)) {
          clearSession();

          return;
        }

        setUser(null);
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
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();

      setUser(currentUser);
      setSessionError(null);
    } catch (error) {
      if (isAuthenticationError(error)) {
        clearSession();

        return;
      }

      setUser(null);
      setSessionError("Unable to verify your session.");

      throw error;
    }
  }, [clearSession]);

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
      clearSession();
    }
  }, [clearSession]);

  // The backend clears the session cookies along with the account.
  const deleteAccount = useCallback(async () => {
    await deleteCurrentUser();

    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,

      isAuthenticated: user !== null,
      isInitializing,

      sessionError,

      signIn,
      signOut,
      refreshUser,
      deleteAccount,
    }),
    [
      user,
      isInitializing,
      sessionError,
      signIn,
      signOut,
      refreshUser,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
