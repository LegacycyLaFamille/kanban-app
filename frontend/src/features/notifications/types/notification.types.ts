// Mirrors NotificationView returned by the backend (dates as ISO strings).
export type AppNotification = {
  id: string;
  type: string;
  readAt: string | null;
  createdAt: string;
  project: { id: string; name: string };
  task: { id: string; title: string | null } | null;
  // null for system events or when the acting user was deleted.
  actor: { id: string; name: string } | null;
  // task.updated only: fields that changed, e.g. ["status", "priority"].
  // Optional for responses from an older backend.
  changes?: string[];
};

export type NotificationPage = {
  items: AppNotification[];
  // Pass as `cursor` to get the next page, null on the last page.
  nextCursor: string | null;
};

export type NotificationListQuery = {
  unread?: boolean;
  limit?: number;
  cursor?: string;
};
