import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { getUnreadNotificationCount } from "../api/notifications.api";

import {
  UnreadNotificationsContext,
  type UnreadNotificationsContextValue,
} from "./UnreadNotificationsContext";

// Notifications are produced asynchronously by the backend event workflow,
// so the count is polled rather than only read once.
export const UNREAD_COUNT_POLL_INTERVAL_MS = 30_000;
export const UNREAD_COUNT_MAX_POLL_INTERVAL_MS = 5 * 60_000;

interface UnreadNotificationsProviderProps {
  children: ReactNode;
  pollIntervalMs?: number;
}

export function UnreadNotificationsProvider({
  children,
  pollIntervalMs = UNREAD_COUNT_POLL_INTERVAL_MS,
}: UnreadNotificationsProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(await getUnreadNotificationCount());
    } catch {
      // The badge is secondary information: keep the last known value.
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    let timeoutId: number | undefined;
    // Doubles after each failure (backend down, network lost) so an
    // unreachable API is not hammered, back to normal after a success.
    let delay = pollIntervalMs;

    async function loadCount() {
      try {
        const count = await getUnreadNotificationCount();

        if (isSubscribed) {
          setUnreadCount(count);
        }
        delay = pollIntervalMs;
      } catch {
        // The badge is secondary information: keep the last known value.
        delay = Math.min(delay * 2, UNREAD_COUNT_MAX_POLL_INTERVAL_MS);
      }
    }

    function schedule() {
      timeoutId = window.setTimeout(async () => {
        // No need to poll a tab nobody is looking at: focus refreshes it.
        if (document.visibilityState !== "hidden") {
          await loadCount();
        }
        if (isSubscribed) schedule();
      }, delay);
    }

    void loadCount().then(() => {
      if (isSubscribed) schedule();
    });

    const handleFocus = () => {
      void loadCount();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isSubscribed = false;
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [pollIntervalMs]);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const value = useMemo<UnreadNotificationsContextValue>(
    () => ({
      unreadCount,
      refreshUnreadCount,
      decrementUnreadCount,
      resetUnreadCount,
    }),
    [unreadCount, refreshUnreadCount, decrementUnreadCount, resetUnreadCount],
  );

  return (
    <UnreadNotificationsContext.Provider value={value}>
      {children}
    </UnreadNotificationsContext.Provider>
  );
}
