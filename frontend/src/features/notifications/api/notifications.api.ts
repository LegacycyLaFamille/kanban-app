import { httpClient } from "../../../shared/api";
import type {
  AppNotification,
  NotificationListQuery,
  NotificationPage,
} from "../types/notification.types";

export function getNotifications(
  query: NotificationListQuery = {},
): Promise<NotificationPage> {
  const params = new URLSearchParams();

  if (query.unread) params.set("unread", "true");
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.cursor) params.set("cursor", query.cursor);

  const search = params.toString();

  return httpClient.get<NotificationPage>(
    search ? `/notifications?${search}` : "/notifications",
  );
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count } = await httpClient.get<{ count: number }>(
    "/notifications/unread-count",
  );

  return count;
}

export function markNotificationRead(
  notificationId: string,
): Promise<AppNotification> {
  return httpClient.patch<AppNotification>(
    `/notifications/${notificationId}/read`,
  );
}

export async function markAllNotificationsRead(): Promise<number> {
  const { updated } = await httpClient.post<{ updated: number }>(
    "/notifications/read-all",
  );

  return updated;
}
