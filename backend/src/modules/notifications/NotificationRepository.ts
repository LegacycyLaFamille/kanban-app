import type { Notification } from "./Notification.js";

// What the API returns for one notification: ids resolved to display names
// so the frontend needs no extra request.
export interface NotificationView {
  id: string;
  type: string;
  readAt: Date | null;
  createdAt: Date;
  project: { id: string; name: string };
  task: { id: string; title: string | null } | null;
  // null for system events or when the acting user was deleted.
  actor: { id: string; name: string } | null;
}

// The cursor is unknown or belongs to another user.
export class InvalidNotificationCursorError extends Error {
  constructor() {
    super("Invalid cursor");
  }
}

export interface NotificationListQuery {
  unreadOnly: boolean;
  limit: number;
  // Id of the last item of the previous page.
  cursor?: string;
}

export interface NotificationRepository {
  // Inserts the notifications, silently skipping those whose
  // (eventId, userId) already exists. Returns how many were inserted.
  createMany(notifications: Notification[]): Promise<number>;
  // Newest first, only the given user's notifications.
  findForUser(
    userId: string,
    query: NotificationListQuery,
  ): Promise<NotificationView[]>;
  countUnread(userId: string): Promise<number>;
  // Returns null when the notification does not exist or belongs to
  // another user. Keeps the original readAt if already read.
  markRead(
    notificationId: string,
    userId: string,
    readAt: Date,
  ): Promise<NotificationView | null>;
  markAllRead(userId: string, readAt: Date): Promise<number>;
}
