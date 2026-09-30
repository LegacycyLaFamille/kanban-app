import { act, renderHook } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../../shared/api";

import { assignAdminTask } from "../api/admin.api";
import { useTaskAssignment } from "./useTaskAssignment";

vi.mock("../api/admin.api", () => ({
  assignAdminTask: vi.fn(),
}));

describe("useTaskAssignment", () => {
  const taskId = "task-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically applies the new assignee before the request resolves", async () => {
    let resolveAssign!: (value: {
      id: string;
      assigneeId: string | null;
    }) => void;
    vi.mocked(assignAdminTask).mockReturnValue(
      new Promise((resolve) => {
        resolveAssign = resolve;
      }),
    );

    const { result } = renderHook(() => useTaskAssignment());

    let assignPromise!: Promise<void>;
    act(() => {
      assignPromise = result.current.assignTask(taskId, null, "user-1");
    });

    expect(result.current.getEffectiveAssigneeId(taskId, null)).toBe("user-1");
    expect(result.current.isPending(taskId)).toBe(true);

    await act(async () => {
      resolveAssign({ id: taskId, assigneeId: "user-1" });
      await assignPromise;
    });

    expect(assignAdminTask).toHaveBeenCalledWith(taskId, "user-1");
  });

  it("calls onPersisted and clears the pending lock after a successful assignment", async () => {
    vi.mocked(assignAdminTask).mockResolvedValue({
      id: taskId,
      assigneeId: "user-1",
    });
    const onPersisted = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useTaskAssignment({ onPersisted }));

    await act(async () => {
      await result.current.assignTask(taskId, null, "user-1");
    });

    expect(onPersisted).toHaveBeenCalledTimes(1);
    expect(result.current.isPending(taskId)).toBe(false);
    expect(result.current.error).toBeNull();
    // The override is cleared once persisted; effective assignee now falls
    // back to whatever the (now stale) currentAssigneeId says, mirroring how
    // the page re-derives it from a freshly refetched list.
    expect(result.current.getEffectiveAssigneeId(taskId, null)).toBeNull();
  });

  it("rolls back the optimistic assignee and surfaces an error on failure", async () => {
    vi.mocked(assignAdminTask).mockRejectedValue(
      new ApiError(400, "ASSIGNEE_NOT_PROJECT_MEMBER", "Not a member."),
    );

    const { result } = renderHook(() => useTaskAssignment());

    await act(async () => {
      await result.current.assignTask(taskId, null, "user-1");
    });

    expect(result.current.getEffectiveAssigneeId(taskId, null)).toBeNull();
    expect(result.current.isPending(taskId)).toBe(false);
    expect(result.current.error).toBe("Not a member.");
  });

  it("falls back to a generic message for a non-API error", async () => {
    vi.mocked(assignAdminTask).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useTaskAssignment());

    await act(async () => {
      await result.current.assignTask(taskId, null, "user-1");
    });

    expect(result.current.error).toBe(
      "Unable to assign task. Please try again.",
    );
  });

  it("ignores a second assignment for the same task while one is already pending", async () => {
    let resolveAssign!: (value: {
      id: string;
      assigneeId: string | null;
    }) => void;
    vi.mocked(assignAdminTask).mockReturnValue(
      new Promise((resolve) => {
        resolveAssign = resolve;
      }),
    );

    const { result } = renderHook(() => useTaskAssignment());

    let firstAssign!: Promise<void>;
    act(() => {
      firstAssign = result.current.assignTask(taskId, null, "user-1");
      // Fired in the same tick, before the first call's request resolves.
      void result.current.assignTask(taskId, null, "user-2");
    });

    expect(assignAdminTask).toHaveBeenCalledTimes(1);
    expect(assignAdminTask).toHaveBeenCalledWith(taskId, "user-1");

    await act(async () => {
      resolveAssign({ id: taskId, assigneeId: "user-1" });
      await firstAssign;
    });
  });

  it("does nothing when the assignee is unchanged", async () => {
    const { result } = renderHook(() => useTaskAssignment());

    await act(async () => {
      await result.current.assignTask(taskId, "user-1", "user-1");
    });

    expect(assignAdminTask).not.toHaveBeenCalled();
  });

  it("supports clearing an assignment (assigning to null)", async () => {
    vi.mocked(assignAdminTask).mockResolvedValue({
      id: taskId,
      assigneeId: null,
    });

    const { result } = renderHook(() => useTaskAssignment());

    await act(async () => {
      await result.current.assignTask(taskId, "user-1", null);
    });

    expect(assignAdminTask).toHaveBeenCalledWith(taskId, null);
  });
});
