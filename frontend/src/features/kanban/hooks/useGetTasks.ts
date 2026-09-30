import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../../../shared/api";
import { getTasksByProject } from "../api/tasks.api";
import type { Task } from "../types/task.types";

export function useGetTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(projectId));
  const [error, setError] = useState<string | null>(null);

  // Sync state during render if projectId changes without triggering effect lint errors
  const [prevProjectId, setPrevProjectId] = useState(projectId);
  if (projectId !== prevProjectId) {
    setPrevProjectId(projectId);
    setIsLoading(Boolean(projectId));
    if (!projectId) {
      setTasks([]);
    }
  }

  // Refetch handler for user-triggered events (Drop, Save, Delete)
  const fetchTasks = useCallback(async (): Promise<Task[] | null> => {
    if (!projectId) {
      setTasks([]);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getTasksByProject(projectId);
      setTasks(data);
      return data;
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to load tasks. Please try again.");
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Effect load: All state updates occur strictly after the async promise resolves
  useEffect(() => {
    let isSubscribed = true;

    if (!projectId) {
      return;
    }

    async function loadTasks() {
      try {
        const data = await getTasksByProject(projectId as string);
        if (isSubscribed) {
          setTasks(data);
          setError(null);
        }
      } catch (requestError) {
        if (isSubscribed) {
          if (requestError instanceof ApiError) {
            setError(requestError.message);
          } else {
            setError("Unable to load tasks. Please try again.");
          }
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
  }, [projectId]);

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
  };
}
