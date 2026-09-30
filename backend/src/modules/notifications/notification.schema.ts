import { z } from "zod";

export const NOTIFICATIONS_DEFAULT_LIMIT = 20;
export const NOTIFICATIONS_MAX_LIMIT = 100;

// Query string of GET /notifications (values arrive as strings).
export const listNotificationsQuerySchema = z.strictObject({
  unread: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(NOTIFICATIONS_MAX_LIMIT)
    .default(NOTIFICATIONS_DEFAULT_LIMIT),
  cursor: z.uuid().optional(),
});

export const notificationIdSchema = z.uuid();

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;
