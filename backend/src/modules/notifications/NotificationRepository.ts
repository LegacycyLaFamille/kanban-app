import type { Notification } from "./Notification.js";

export interface NotificationRepository {
  // Inserts the notifications, silently skipping those whose
  // (eventId, userId) already exists. Returns how many were inserted.
  createMany(notifications: Notification[]): Promise<number>;
}
