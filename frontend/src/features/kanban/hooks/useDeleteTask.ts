import { useCallback, useState } from "react";

import { toUserMessage } from "../../../shared/api";
import { deleteTask } from "../api/tasks.api";

export function useDeleteTask() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      setError(null);

      await deleteTask(taskId);
      return true;
    } catch (requestError) {
      setError(
        toUserMessage(requestError, "Unable to delete task. Please try again."),
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    submit,
    isSubmitting,
    error,
  };
}
