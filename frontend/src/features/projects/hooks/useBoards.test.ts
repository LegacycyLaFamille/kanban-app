import { act, renderHook, waitFor } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../../shared/api";

import {
  createBoard,
  deleteBoard,
  getBoards,
  updateBoard,
} from "../api/boards.api";

import type { ProjectBoard } from "../types/project-api.types";

import { useBoards } from "./useBoards";

vi.mock("../api/boards.api", () => ({
  getBoards: vi.fn(),
  createBoard: vi.fn(),
  updateBoard: vi.fn(),
  deleteBoard: vi.fn(),
}));

const board: ProjectBoard = {
  id: "board-1",
  name: "Development",
  projectId: "project-1",
  createdAt: "2026-09-26T15:00:00.000Z",
};

describe("useBoards", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(getBoards).mockResolvedValue([board]);
  });

  it("loads boards for the selected project", async () => {
    const { result } = renderHook(() => useBoards("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getBoards).toHaveBeenCalledWith("project-1");
    expect(result.current.boards).toEqual([board]);
    expect(result.current.error).toBeNull();
  });

  it("exposes a loading error", async () => {
    vi.mocked(getBoards).mockRejectedValue(new Error("Network unavailable"));

    const { result } = renderHook(() => useBoards("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Unable to load project boards.");
  });

  it("adds a board after a successful creation", async () => {
    const newBoard: ProjectBoard = {
      ...board,
      id: "board-2",
      name: "Backlog",
    };

    vi.mocked(createBoard).mockResolvedValue(newBoard);

    const { result } = renderHook(() => useBoards("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createBoard({ name: "Backlog" });
    });

    expect(createBoard).toHaveBeenCalledWith("project-1", {
      name: "Backlog",
    });

    expect(result.current.boards).toEqual([board, newBoard]);
  });

  it("replaces a board after a successful update", async () => {
    const updatedBoard: ProjectBoard = {
      ...board,
      name: "Backlog",
    };

    vi.mocked(updateBoard).mockResolvedValue(updatedBoard);

    const { result } = renderHook(() => useBoards("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateBoard("board-1", {
        name: "Backlog",
      });
    });

    expect(updateBoard).toHaveBeenCalledWith("board-1", {
      name: "Backlog",
    });

    expect(result.current.boards).toEqual([updatedBoard]);
  });

  it("removes a board after a successful deletion", async () => {
    vi.mocked(deleteBoard).mockResolvedValue(undefined);

    const { result } = renderHook(() => useBoards("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let deleted = false;

    await act(async () => {
      deleted = await result.current.deleteBoard("board-1");
    });

    expect(deleted).toBe(true);
    expect(result.current.boards).toEqual([]);
  });

  it("keeps a board when deletion is forbidden", async () => {
    vi.mocked(deleteBoard).mockRejectedValue(
      new ApiError(403, "FORBIDDEN", "Access denied."),
    );

    const { result } = renderHook(() => useBoards("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let deleted = true;

    await act(async () => {
      deleted = await result.current.deleteBoard("board-1");
    });

    expect(deleted).toBe(false);
    expect(result.current.boards).toEqual([board]);

    expect(result.current.mutationError).toBe(
      "You do not have permission to perform this action.",
    );
  });

  it("reloads boards from the API", async () => {
    vi.mocked(getBoards)
      .mockResolvedValueOnce([board])
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => useBoards("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(getBoards).toHaveBeenCalledTimes(2);
    expect(result.current.boards).toEqual([]);
  });
});
