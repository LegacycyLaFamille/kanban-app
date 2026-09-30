import { createContext } from "react";

import type { AuthUser, LoginPayload } from "../types/auth.types";

export interface AuthContextValue {
  user: AuthUser | null;

  isAuthenticated: boolean;
  isInitializing: boolean;

  sessionError: string | null;

  signIn: (payload: LoginPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
