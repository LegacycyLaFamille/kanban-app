import { httpClient } from "../../../shared/api";

import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "../types/auth.types";

export function register(payload: RegisterPayload): Promise<unknown> {
  return httpClient.post<unknown, RegisterPayload>("/auth/register", payload, {
    skipAuthRefresh: true,
  });
}

export function login(payload: LoginPayload): Promise<unknown> {
  return httpClient.post<unknown, LoginPayload>("/auth/login", payload, {
    skipAuthRefresh: true,
  });
}

export function getCurrentUser(): Promise<AuthUser> {
  return httpClient.get<AuthUser>("/auth/me");
}

export function refresh(): Promise<unknown> {
  return httpClient.post<unknown>("/auth/refresh", undefined, {
    skipAuthRefresh: true,
  });
}

export function logout(): Promise<unknown> {
  return httpClient.post<unknown>("/auth/logout", undefined, {
    skipAuthRefresh: true,
  });
}
