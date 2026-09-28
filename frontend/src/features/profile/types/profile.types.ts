export interface UpdateProfilePayload {
  name?: string;
  email?: string;
}

export interface ProfileFormValues {
  name: string;
  email: string;
}

export type ProfileFieldErrors = Partial<
  Record<keyof ProfileFormValues, string>
>;

export interface ProfileStats {
  projectCount: number;
  taskCount: number;
  tasksByStatus: Record<string, number>;
}

export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type ChangePasswordFieldErrors = Partial<
  Record<keyof ChangePasswordFormValues, string>
>;
