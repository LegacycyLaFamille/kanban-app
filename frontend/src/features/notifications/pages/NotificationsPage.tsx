import { useState } from "react";
import { Badge, Button, Card, Text, View } from "reshaped";
import { useNavigate } from "react-router-dom";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../shared/components/Feedback";
import {
  useNotifications,
  type NotificationFilter,
} from "../hooks/useNotifications";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";
import type { AppNotification } from "../types/notification.types";
import {
  formatRelativeTime,
  notificationMessage,
  notificationTarget,
} from "../utils/notificationMessage";

import styles from "./NotificationsPage.module.css";

const filters: { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
];

export function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { unreadCount } = useUnreadNotifications();
  const {
    notifications,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    actionError,
    reload,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications(filter);

  const hasUnread = unreadCount > 0 || notifications.some((n) => !n.readAt);

  const handleOpen = (notification: AppNotification) => {
    void markRead(notification.id);
    navigate(notificationTarget(notification));
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState label="Loading notifications" />;
    }

    if (error) {
      return (
        <ErrorState
          title="Notifications unavailable"
          message={error}
          onRetry={reload}
        />
      );
    }

    if (notifications.length === 0) {
      return filter === "unread" ? (
        <EmptyState
          title="You're all caught up"
          description="You have no unread notifications."
        />
      ) : (
        <EmptyState
          title="No notifications yet"
          description="You will be notified when tasks are created or completed in your projects."
        />
      );
    }

    return (
      <ul className={styles.list} aria-label="Notifications">
        {notifications.map((notification) => {
          const isUnread = !notification.readAt;

          return (
            <li key={notification.id} className={styles.item}>
              <button
                type="button"
                className={styles.itemButton}
                onClick={() => handleOpen(notification)}
              >
                <span
                  className={`${styles.dot} ${isUnread ? styles.unreadDot : ""}`}
                  aria-hidden="true"
                />
                <span className={styles.itemBody}>
                  <Text weight={isUnread ? "bold" : "regular"}>
                    {notificationMessage(notification)}
                  </Text>
                  <Text color="neutral-faded" variant="caption-1">
                    {notification.project.name} ·{" "}
                    <time dateTime={notification.createdAt}>
                      {formatRelativeTime(notification.createdAt)}
                    </time>
                  </Text>
                </span>
                {isUnread && (
                  <Badge size="small" color="primary">
                    New
                  </Badge>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section className={styles.page}>
      <View gap={6}>
        <header className={styles.header}>
          <div>
            <Text variant="featured-2" weight="bold">
              Notifications
            </Text>
            <Text color="neutral-faded">
              Activity on the projects you own or are a member of.
            </Text>
          </div>

          <Button
            variant="outline"
            disabled={!hasUnread}
            onClick={() => void markAllRead()}
          >
            Mark all as read
          </Button>
        </header>

        <div className={styles.filters} role="group" aria-label="Filter">
          {filters.map((item) => (
            <Button
              key={item.value}
              size="small"
              variant={filter === item.value ? "solid" : "outline"}
              color={filter === item.value ? "primary" : "neutral"}
              attributes={{ "aria-pressed": filter === item.value }}
              onClick={() => setFilter(item.value)}
            >
              {item.value === "unread" && unreadCount > 0
                ? `${item.label} (${unreadCount})`
                : item.label}
            </Button>
          ))}
        </div>

        {actionError && (
          <div role="alert">
            <Text color="critical">{actionError}</Text>
          </div>
        )}

        <Card padding={2}>{renderContent()}</Card>

        {!isLoading && !error && hasMore && (
          <div className={styles.footer}>
            <Button
              variant="outline"
              loading={isLoadingMore}
              onClick={() => void loadMore()}
            >
              Load more
            </Button>
          </div>
        )}
      </View>
    </section>
  );
}
