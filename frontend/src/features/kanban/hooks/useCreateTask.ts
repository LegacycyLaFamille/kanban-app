import { useCallback, useState } from "react";

import { ApiError } from "../../../shared/api";
import { createTask } from "../api/tasks.api";
import type { CreateTaskDto, Task } from "../types/task.types";

export function useCreateTask() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (projectId: string, payload: CreateTaskDto): Promise<Task | null> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const createdTask = await createTask(projectId, payload);
        return createdTask;
      } catch (requestError) {
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Unable to create task. Please try again.");
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
