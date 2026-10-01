import { createContext } from "react";

export interface UnreadNotificationsContextValue {
  unreadCount: number;

  // Re-reads the count from the backend.
  refreshUnreadCount: () => Promise<void>;
  // Local updates after a mark-as-read, so the badge reacts immediately.
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

export const UnreadNotificationsContext =
  createContext<UnreadNotificationsContextValue | null>(null);
