import { useCallback, useEffect, useState } from "react";

import { toUserMessage } from "../../../shared/api";
import { getSystemStatus } from "../api/admin.api";
import type { SystemStatus } from "../types/system.types";

export const SYSTEM_REFRESH_INTERVAL_MS = 15_000;

const LOAD_ERROR = "Unable to load the system status. Please try again.";

/**
 * System status for the admin page, refreshed every 15 s while
 * `autoRefresh` is on and the tab is visible. The last status stays shown
 * while a refresh is in flight or after it fails.
 */
export function useSystemStatus(intervalMs = SYSTEM_REFRESH_INTERVAL_MS) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // State is only set once the request settles.
  const load = useCallback(async () => {
    try {
      const data = await getSystemStatus();
      setStatus(data);
      setError(null);
    } catch (requestError) {
      setError(toUserMessage(requestError, LOAD_ERROR));
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  // Initial load: state is only set once the request settles, and only if
  // the page is still mounted.
  useEffect(() => {
    let isSubscribed = true;

    async function loadInitial() {
      try {
        const data = await getSystemStatus();
        if (isSubscribed) setStatus(data);
      } catch (requestError) {
        if (isSubscribed) setError(toUserMessage(requestError, LOAD_ERROR));
      }
    }

    void loadInitial();

    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "hidden") void load();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [autoRefresh, intervalMs, load]);

  return {
    status,
    error,
    isLoading: status === null && error === null,
    isRefreshing,
    refresh,
    autoRefresh,
    setAutoRefresh,
  };
}
