import { useCallback, useRef, useState } from "react";

import { ApiError } from "../../../shared/api";
import { updateTask } from "../api/tasks.api";
import type { Task, TaskStatus } from "../types/task.types";

interface UseTaskDragAndDropOptions {
  /** Called after a move is successfully persisted, e.g. to refetch the board. */
  onPersisted?: () => void | Promise<void>;
}

/**
 * Owns the optimistic-update / rollback / per-task pending-lock behaviour for
 * moving a task between Kanban columns. Kept separate from Board.tsx so the
 * persistence logic is unit-testable without rendering the drag-and-drop tree.
 */
export function useTaskDragAndDrop({
  onPersisted,
}: UseTaskDragAndDropOptions = {}) {
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, TaskStatus>
  >({});
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  // Mirrors pendingTaskIds synchronously so two moveTask calls fired in the
  // same tick (before React re-renders) still see each other — state alone
  // would let both calls read the same stale, empty Set.
  const pendingRef = useRef<Set<string>>(new Set());

  const [error, setError] = useState<string | null>(null);

  const getEffectiveStatus = useCallback(
    (task: Task): TaskStatus | string =>
      statusOverrides[task.id] ?? task.status,
    [statusOverrides],
  );

  const isPending = useCallback(
    (taskId: string) => pendingTaskIds.has(taskId),
    [pendingTaskIds],
  );

  const clearError = useCallback(() => setError(null), []);

  const moveTask = useCallback(
    async (task: Task, targetStatus: TaskStatus): Promise<void> => {
      if (pendingRef.current.has(task.id) || task.status === targetStatus) {
        return;
      }

      pendingRef.current.add(task.id);
      setError(null);
      setStatusOverrides((prev) => ({ ...prev, [task.id]: targetStatus }));
      setPendingTaskIds(new Set(pendingRef.current));

      try {
        await updateTask(task.id, { status: targetStatus });
        // Reconcile with the server before dropping the optimistic override:
        // if onPersisted (a refetch) hasn't caught up yet, clearing it first
        // would flash the card back to its old, now-stale status.
        await onPersisted?.();
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      } catch (requestError) {
        // Roll back: drop the optimistic override so the task falls back to
        // its last known-good (server) status.
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Unable to move task. Please try again.",
        );
      } finally {
        pendingRef.current.delete(task.id);
        setPendingTaskIds(new Set(pendingRef.current));
      }
    },
    [onPersisted],
  );

  return {
    getEffectiveStatus,
    isPending,
    moveTask,
    error,
    clearError,
  };
}
