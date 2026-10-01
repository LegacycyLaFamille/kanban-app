import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../../../shared/api";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications.api";
import type { AppNotification } from "../types/notification.types";

import { useUnreadNotifications } from "./useUnreadNotifications";

export const NOTIFICATIONS_PAGE_SIZE = 20;

export type NotificationFilter = "all" | "unread";

function toMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useNotifications(filter: NotificationFilter = "all") {
  const { refreshUnreadCount, decrementUnreadCount, resetUnreadCount } =
    useUnreadNotifications();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isSubscribed = true;

    async function loadFirstPage() {
      setIsLoading(true);
      setError(null);
      setActionError(null);

      try {
        const page = await getNotifications({
          unread: filter === "unread",
          limit: NOTIFICATIONS_PAGE_SIZE,
        });

        if (isSubscribed) {
          setNotifications(page.items);
          setNextCursor(page.nextCursor);
        }
      } catch (requestError) {
        if (isSubscribed) {
          setNotifications([]);
          setNextCursor(null);
          setError(
            toMessage(
              requestError,
              "Unable to load your notifications. Please try again.",
            ),
          );
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    void loadFirstPage();
    // Keep the sidebar badge consistent with what the page shows.
    void refreshUnreadCount();

    return () => {
      isSubscribed = false;
    };
  }, [filter, reloadKey, refreshUnreadCount]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setActionError(null);

    try {
      const page = await getNotifications({
        unread: filter === "unread",
        limit: NOTIFICATIONS_PAGE_SIZE,
        cursor: nextCursor,
      });

      setNotifications((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (requestError) {
      setActionError(
        toMessage(requestError, "Unable to load more notifications."),
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [filter, nextCursor, isLoadingMore]);

  const markRead = useCallback(
    async (notificationId: string) => {
      const target = notifications.find((n) => n.id === notificationId);
      if (!target || target.readAt) return;

      setActionError(null);

      try {
        const updated = await markNotificationRead(notificationId);

        setNotifications((current) =>
          current.map((n) => (n.id === notificationId ? updated : n)),
        );
        decrementUnreadCount();
      } catch (requestError) {
        setActionError(
          toMessage(requestError, "Unable to mark the notification as read."),
        );
      }
    },
    [notifications, decrementUnreadCount],
  );

  const markAllRead = useCallback(async () => {
    setActionError(null);

    try {
      await markAllNotificationsRead();

      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((n) => (n.readAt ? n : { ...n, readAt })),
      );
      resetUnreadCount();
    } catch (requestError) {
      setActionError(
        toMessage(requestError, "Unable to mark all notifications as read."),
      );
    }
  }, [resetUnreadCount]);

  return {
    notifications,
    hasMore: nextCursor !== null,
    isLoading,
    isLoadingMore,
    error,
    actionError,
    reload,
    loadMore,
    markRead,
    markAllRead,
  };
}
