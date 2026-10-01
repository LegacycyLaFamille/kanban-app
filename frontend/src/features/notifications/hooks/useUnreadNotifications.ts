import { useContext } from "react";

import {
  UnreadNotificationsContext,
  type UnreadNotificationsContextValue,
} from "../context/UnreadNotificationsContext";

// Outside the provider (e.g. isolated tests) the count is simply 0 and the
// updates are no-ops, so pages stay usable on their own.
const fallback: UnreadNotificationsContextValue = {
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  decrementUnreadCount: () => {},
  resetUnreadCount: () => {},
};

export function useUnreadNotifications(): UnreadNotificationsContextValue {
  return useContext(UnreadNotificationsContext) ?? fallback;
}
