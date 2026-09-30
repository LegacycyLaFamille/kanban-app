import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../../../shared/api";
import { getAdminTasks } from "../api/admin.api";
import type { AdminProjectTasks } from "../types/admin.types";

export function useAdminTasks() {
  const [projectGroups, setProjectGroups] = useState<AdminProjectTasks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refetch handler for user-triggered events (assignment).
  const fetchTasks = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getAdminTasks();
      setProjectGroups(data);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Unable to load tasks. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect load: all state updates occur strictly after the async promise
  // resolves, and only if the component is still mounted.
  useEffect(() => {
    let isSubscribed = true;

    async function loadTasks() {
      try {
        const data = await getAdminTasks();
        if (isSubscribed) {
          setProjectGroups(data);
          setError(null);
        }
      } catch (requestError) {
        if (isSubscribed) {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : "Unable to load tasks. Please try again.",
          );
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      isSubscribed = false;
    };
  }, []);

  return {
    projectGroups,
    isLoading,
    error,
    refetch: fetchTasks,
  };
}
