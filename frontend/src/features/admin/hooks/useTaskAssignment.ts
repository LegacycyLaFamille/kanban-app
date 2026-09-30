import { useCallback, useRef, useState } from "react";

import { ApiError } from "../../../shared/api";
import { assignAdminTask } from "../api/admin.api";

interface UseTaskAssignmentOptions {
  /** Called after an assignment is successfully persisted, e.g. to refetch the list. */
  onPersisted?: () => void | Promise<void>;
}

/**
 * Owns the optimistic-update / rollback / per-task pending-lock behaviour
 * for assigning a task to a user, mirroring useTaskDragAndDrop's pattern
 * (frontend/src/features/kanban/hooks/useTaskDragAndDrop.ts) exactly rather
 * than reinventing a different failure-handling approach for a very similar
 * "change one field, persist it, roll back on failure" interaction.
 */
export function useTaskAssignment({
  onPersisted,
}: UseTaskAssignmentOptions = {}) {
  const [assigneeOverrides, setAssigneeOverrides] = useState<
    Record<string, string | null>
  >({});
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  // Mirrors pendingTaskIds synchronously so two assignTask calls fired in the
  // same tick (before React re-renders) still see each other.
  const pendingRef = useRef<Set<string>>(new Set());

  const [error, setError] = useState<string | null>(null);

  const getEffectiveAssigneeId = useCallback(
    (taskId: string, currentAssigneeId: string | null): string | null =>
      taskId in assigneeOverrides
        ? (assigneeOverrides[taskId] ?? null)
        : currentAssigneeId,
    [assigneeOverrides],
  );

  const isPending = useCallback(
    (taskId: string) => pendingTaskIds.has(taskId),
    [pendingTaskIds],
  );

  const clearError = useCallback(() => setError(null), []);

  const assignTask = useCallback(
    async (
      taskId: string,
      currentAssigneeId: string | null,
      newAssigneeId: string | null,
    ): Promise<void> => {
      if (
        pendingRef.current.has(taskId) ||
        currentAssigneeId === newAssigneeId
      ) {
        return;
      }

      pendingRef.current.add(taskId);
      setError(null);
      setAssigneeOverrides((prev) => ({ ...prev, [taskId]: newAssigneeId }));
      setPendingTaskIds(new Set(pendingRef.current));

      try {
        await assignAdminTask(taskId, newAssigneeId);
        // Reconcile with the server before dropping the optimistic override:
        // if onPersisted (a refetch) hasn't caught up yet, clearing it first
        // would flash the row back to its old, now-stale assignee.
        await onPersisted?.();
        setAssigneeOverrides((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      } catch (requestError) {
        setAssigneeOverrides((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Unable to assign task. Please try again.",
        );
      } finally {
        pendingRef.current.delete(taskId);
        setPendingTaskIds(new Set(pendingRef.current));
      }
    },
    [onPersisted],
  );

  return {
    getEffectiveAssigneeId,
    isPending,
    assignTask,
    error,
    clearError,
  };
}
