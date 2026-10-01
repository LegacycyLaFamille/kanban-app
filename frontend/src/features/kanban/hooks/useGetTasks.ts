import { useCallback, useEffect, useState } from "react";

import { toUserMessage } from "../../../shared/api";
import { getTasksByProject } from "../api/tasks.api";
import type { Task } from "../types/task.types";

const LOAD_ERROR = "Unable to load tasks. Please try again.";

// Tasks are fetched per project; when boardId is set, only that board's tasks
// are kept so each board shows its own Kanban.
function onBoard(tasks: Task[], boardId?: string): Task[] {
  return boardId ? tasks.filter((task) => task.boardId === boardId) : tasks;
}

export function useGetTasks(projectId?: string, boardId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(projectId));
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state during render if projectId changes without triggering effect lint errors
  const [prevProjectId, setPrevProjectId] = useState(projectId);
  const [prevBoardId, setPrevBoardId] = useState(boardId);
  if (projectId !== prevProjectId || boardId !== prevBoardId) {
    setPrevProjectId(projectId);
    setPrevBoardId(boardId);
    setIsLoading(Boolean(projectId));
    setHasLoaded(false);
    setError(null);
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

      const data = onBoard(await getTasksByProject(projectId), boardId);
      setTasks(data);
      setHasLoaded(true);
      return data;
    } catch (requestError) {
      setError(toUserMessage(requestError, LOAD_ERROR));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, boardId]);

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
          setTasks(onBoard(data, boardId));
          setHasLoaded(true);
          setError(null);
        }
      } catch (requestError) {
        if (isSubscribed) {
          setError(toUserMessage(requestError, LOAD_ERROR));
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
  }, [projectId, boardId]);

  return {
    tasks,
    isLoading,
    hasLoaded,
    error,
    refetch: fetchTasks,
  };
}
