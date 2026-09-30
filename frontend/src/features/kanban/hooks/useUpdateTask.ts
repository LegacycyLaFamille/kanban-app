import { useCallback, useState } from "react";

import { ApiError } from "../../../shared/api";
import { updateTask } from "../api/tasks.api";
import type { Task, UpdateTaskDto } from "../types/task.types";

export function useUpdateTask() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (taskId: string, payload: UpdateTaskDto): Promise<Task | null> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const updatedTask = await updateTask(taskId, payload);
        return updatedTask;
      } catch (requestError) {
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Unable to update task. Please try again.");
        }
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return {
    submit,
    isSubmitting,
    error,
  };
}
