import { useEffect, useState } from "react";

import { ApiError } from "../../../shared/api";
import { getMyTasks } from "../api/myTasks.api";
import type { MyTask, MyTaskProjectGroup } from "../types/myTasks.types";

function groupByProject(tasks: MyTask[]): MyTaskProjectGroup[] {
  const groups = new Map<string, MyTaskProjectGroup>();

  for (const task of tasks) {
    const existing = groups.get(task.project.id);

    if (existing) {
      existing.tasks.push(task);
    } else {
      groups.set(task.project.id, {
        projectId: task.project.id,
        projectName: task.project.name,
        tasks: [task],
      });
    }
  }

  return Array.from(groups.values());
}

export function useMyTasks() {
  const [projectGroups, setProjectGroups] = useState<MyTaskProjectGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadTasks() {
      try {
        const data = await getMyTasks();

        if (isSubscribed) {
          setProjectGroups(groupByProject(data));
          setError(null);
        }
      } catch (requestError) {
        if (isSubscribed) {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : "Unable to load your tasks. Please try again.",
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
  };
}
