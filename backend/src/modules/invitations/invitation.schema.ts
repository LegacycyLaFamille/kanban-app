import { z } from "zod";
import { projectRoleSchema } from "../projects/project.schema.js";

export const inviteProjectMemberSchema = z.strictObject({
  email: z.email(),
  role: projectRoleSchema.default("VIEWER"),
});

export const invitationIdSchema = z.uuid();

export type InviteProjectMemberInput = z.infer<
  typeof inviteProjectMemberSchema
>;
