import { afterEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@testing-library/react";

import { getMyTasks } from "../api/myTasks.api";
import type { MyTask } from "../types/myTasks.types";

import { useMyTasks } from "./useMyTasks";

vi.mock("../api/myTasks.api", () => ({
  getMyTasks: vi.fn(),
}));

describe("useMyTasks", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("groups tasks by project while preserving task order within a group", async () => {
    const tasks: MyTask[] = [
      {
        id: "task-1",
        title: "A",
        description: "",
        projectId: "proj-1",
        status: "TODO",
        priority: "Medium",
        deadline: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        boardId: null,
        assigneeId: "user-1",
        project: { id: "proj-1", name: "Marketing Site" },
      },
      {
        id: "task-2",
        title: "B",
        description: "",
        projectId: "proj-2",
        status: "TODO",
        priority: "Medium",
        deadline: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        boardId: null,
        assigneeId: "user-1",
        project: { id: "proj-2", name: "Mobile App" },
      },
      {
        id: "task-3",
        title: "C",
        description: "",
        projectId: "proj-1",
        status: "DONE",
        priority: "Low",
        deadline: null,
        createdAt: "2026-09-02T00:00:00.000Z",
        boardId: null,
        assigneeId: "user-1",
        project: { id: "proj-1", name: "Marketing Site" },
      },
    ];

    vi.mocked(getMyTasks).mockResolvedValue(tasks);

    const { result } = renderHook(() => useMyTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.projectGroups).toEqual([
      {
        projectId: "proj-1",
        projectName: "Marketing Site",
        tasks: [tasks[0], tasks[2]],
      },
      {
        projectId: "proj-2",
        projectName: "Mobile App",
        tasks: [tasks[1]],
      },
    ]);
  });

  it("surfaces an empty list without an error when the user has no assigned tasks", async () => {
    vi.mocked(getMyTasks).mockResolvedValue([]);

    const { result } = renderHook(() => useMyTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.projectGroups).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("surfaces an error message when the request fails", async () => {
    vi.mocked(getMyTasks).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useMyTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(
      "Unable to load your tasks. Please try again.",
    );
  });
});
