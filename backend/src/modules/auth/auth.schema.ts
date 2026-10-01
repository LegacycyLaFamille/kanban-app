import { z } from "zod";

export const registerSchema = z.strictObject({
  email: z.email(),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(8),
});

export const loginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z
  .strictObject({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.email().trim().optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: "At least one field must be provided",
  });

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must differ from the current one",
    path: ["newPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
