import { z } from "zod";
import { emailSchema } from "../../shared/http/schemas.js";
import { PROJECT_ROLES } from "./ProjectMember.js";

export const projectRoleSchema = z.enum(PROJECT_ROLES);

export const createProjectSchema = z.strictObject({
  name: z.string().trim().min(1, "Name is required").max(200),
  // The Project domain/DB column is a required, non-nullable string
  // (Project.description in schema.prisma); default to "" rather than
  // requiring callers to always send it.
  description: z.string().trim().max(2000).default(""),
});

export const updateProjectSchema = z
  .strictObject({
    name: z.string().trim().min(1, "Name is required").max(200).optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "At least one field must be provided",
  });

export const addProjectMemberSchema = z.strictObject({
  email: emailSchema,
  role: projectRoleSchema.default("VIEWER"),
});

export const updateProjectMemberSchema = z.strictObject({
  role: projectRoleSchema,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
