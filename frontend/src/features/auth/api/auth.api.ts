import { httpClient } from "../../../shared/api";

import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from "../types/auth.types";

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return httpClient.post<AuthResponse, LoginPayload>("/auth/login", payload);
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return httpClient.post<AuthResponse, RegisterPayload>(
    "/auth/register",
    payload,
  );
}
