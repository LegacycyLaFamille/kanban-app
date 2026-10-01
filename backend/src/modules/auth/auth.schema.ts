import { z } from "zod";
import { emailSchema, newPasswordSchema } from "../../shared/http/schemas.js";

export const registerSchema = z.strictObject({
  email: emailSchema,
  name: z.string().trim().min(2).max(100),
  password: newPasswordSchema,
});

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z
  .strictObject({
    name: z.string().trim().min(2).max(100).optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: "At least one field must be provided",
  });

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: newPasswordSchema,
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must differ from the current one",
    path: ["newPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
