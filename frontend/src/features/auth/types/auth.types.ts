export type UserRole = "USER" | "ADMIN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  // Always present on the real GET /auth/me response; optional here for the
  // same reason createdAt is — existing test mocks don't all set it, and
  // no UI consumes it yet (see the admin dashboard follow-up ticket).
  role?: UserRole;
  createdAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface RegisterFormValues extends RegisterPayload {
  confirmPassword: string;
}

export type AuthFieldErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword", string>
>;
