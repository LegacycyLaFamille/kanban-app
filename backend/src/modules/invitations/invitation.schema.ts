import { z } from "zod";
import { emailSchema } from "../../shared/http/schemas.js";
import { projectRoleSchema } from "../projects/project.schema.js";

export const inviteProjectMemberSchema = z.strictObject({
  email: emailSchema,
  role: projectRoleSchema.default("VIEWER"),
});

export const invitationIdSchema = z.uuid();

export type InviteProjectMemberInput = z.infer<
  typeof inviteProjectMemberSchema
>;
