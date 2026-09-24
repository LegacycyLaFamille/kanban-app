import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../../../shared/api";
import { getTasksByProject } from "../api/tasks.api";
import type { Task } from "../types/task.types";

export function useGetTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
  };
}
