export interface AuthUser {
  id: string;
  name: string;
  email: string;
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
