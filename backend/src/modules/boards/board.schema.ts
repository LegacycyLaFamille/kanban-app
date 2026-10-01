import { z } from "zod";

const nameSchema = z.string().trim().min(1, "Name is required").max(100);

// Create and rename take the same body: only the name can change, the
// project of a board is fixed by the route.
export const boardSchema = z.strictObject({
  name: nameSchema,
});

export type BoardInput = z.infer<typeof boardSchema>;
