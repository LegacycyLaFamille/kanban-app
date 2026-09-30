import { z } from "zod";

// null clears the assignment; the key must be present either way, so a
// caller can't send an empty body and have nothing happen.
export const assignTaskSchema = z.strictObject({
  assigneeId: z.uuid().nullable(),
});

export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
