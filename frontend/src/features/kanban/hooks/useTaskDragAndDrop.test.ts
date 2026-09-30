import { act, renderHook } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../../shared/api";

import { updateTask } from "../api/tasks.api";
import type { Task, TaskStatus } from "../types/task.types";
import { useTaskDragAndDrop } from "./useTaskDragAndDrop";

vi.mock("../api/tasks.api", () => ({
  updateTask: vi.fn(),
}));

describe("useTaskDragAndDrop", () => {
  const task: Task = {
    id: "task-1",
    title: "Design the login page",
    description: "",
    priority: "Low",
    status: "TODO",
    projectId: "project-1",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically applies the new status before the request resolves", async () => {
    let resolveUpdate!: (task: Task) => void;
    vi.mocked(updateTask).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    const { result } = renderHook(() => useTaskDragAndDrop());

    let movePromise!: Promise<void>;
    act(() => {
      movePromise = result.current.moveTask(task, "IN_PROGRESS");
    });

    expect(result.current.getEffectiveStatus(task)).toBe("IN_PROGRESS");
    expect(result.current.isPending(task.id)).toBe(true);

    await act(async () => {
      resolveUpdate({ ...task, status: "IN_PROGRESS" });
      await movePromise;
    });

    expect(updateTask).toHaveBeenCalledWith(task.id, {
      status: "IN_PROGRESS",
    });
  });

  it("calls onPersisted and clears the pending lock after a successful move", async () => {
    vi.mocked(updateTask).mockResolvedValue({ ...task, status: "DONE" });
    const onPersisted = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useTaskDragAndDrop({ onPersisted }));

    await act(async () => {
      await result.current.moveTask(task, "DONE");
    });

    expect(onPersisted).toHaveBeenCalledTimes(1);
    expect(result.current.isPending(task.id)).toBe(false);
    expect(result.current.error).toBeNull();
    // The override is cleared once persisted; effective status now falls
    // back to whatever the (now stale) task object says, mirroring how
    // Board.tsx re-derives it from freshly refetched backend data.
    expect(result.current.getEffectiveStatus(task)).toBe(task.status);
  });

  it("rolls back the optimistic status and surfaces an error on failure", async () => {
    vi.mocked(updateTask).mockRejectedValue(
      new ApiError(403, "FORBIDDEN", "You are not authorized."),
    );

    const { result } = renderHook(() => useTaskDragAndDrop());

    await act(async () => {
      await result.current.moveTask(task, "DONE");
    });

    expect(result.current.getEffectiveStatus(task)).toBe(task.status);
    expect(result.current.isPending(task.id)).toBe(false);
    expect(result.current.error).toBe("You are not authorized.");
  });

  it("falls back to a generic message for a non-API error", async () => {
    vi.mocked(updateTask).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useTaskDragAndDrop());

    await act(async () => {
      await result.current.moveTask(task, "DONE");
    });

    expect(result.current.error).toBe("Unable to move task. Please try again.");
  });

  it("ignores a second move for the same task while one is already pending", async () => {
    let resolveUpdate!: (task: Task) => void;
    vi.mocked(updateTask).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    const { result } = renderHook(() => useTaskDragAndDrop());

    let firstMove!: Promise<void>;
    act(() => {
      firstMove = result.current.moveTask(task, "IN_PROGRESS");
      // Fired in the same tick, before the first call's request resolves.
      void result.current.moveTask(task, "DONE");
    });

    expect(updateTask).toHaveBeenCalledTimes(1);
    expect(updateTask).toHaveBeenCalledWith(task.id, {
      status: "IN_PROGRESS",
    });

    await act(async () => {
      resolveUpdate({ ...task, status: "IN_PROGRESS" });
      await firstMove;
    });
  });

  it("does nothing when dropped back onto its current column", async () => {
    const { result } = renderHook(() => useTaskDragAndDrop());

    await act(async () => {
      await result.current.moveTask(task, task.status as TaskStatus);
    });

    expect(updateTask).not.toHaveBeenCalled();
  });
});
