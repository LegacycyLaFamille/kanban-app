import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, httpClient } from "../../../shared/api";

import type { ProjectBoard } from "../types/project-api.types";

import { createBoard, deleteBoard, getBoards, updateBoard } from "./boards.api";

const board: ProjectBoard = {
  id: "board-1",
  name: "Development",
  projectId: "project-1",
  createdAt: "2026-09-26T15:00:00.000Z",
};

describe("boards.api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads boards belonging to a project", async () => {
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue([board]);

    const result = await getBoards("project-1");

    expect(getSpy).toHaveBeenCalledWith("/projects/project-1/boards");
    expect(result).toEqual([board]);
  });

  it("creates a board in a project", async () => {
    const payload = { name: "Development" };

    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(board);

    const result = await createBoard("project-1", payload);

    expect(postSpy).toHaveBeenCalledWith("/projects/project-1/boards", payload);
    expect(result).toEqual(board);
  });

  it("renames a board", async () => {
    const payload = { name: "Backlog" };
    const updatedBoard = { ...board, name: "Backlog" };

    const patchSpy = vi
      .spyOn(httpClient, "patch")
      .mockResolvedValue(updatedBoard);

    const result = await updateBoard("board-1", payload);

    expect(patchSpy).toHaveBeenCalledWith("/boards/board-1", payload);
    expect(result).toEqual(updatedBoard);
  });

  it("deletes a board", async () => {
    const deleteSpy = vi
      .spyOn(httpClient, "delete")
      .mockResolvedValue(undefined);

    await deleteBoard("board-1");

    expect(deleteSpy).toHaveBeenCalledWith("/boards/board-1");
  });

  it("encodes project and board IDs", async () => {
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue([]);
    const patchSpy = vi.spyOn(httpClient, "patch").mockResolvedValue(board);

    await getBoards("project/with spaces");
    await updateBoard("board/with spaces", { name: "Development" });

    expect(getSpy).toHaveBeenCalledWith(
      "/projects/project%2Fwith%20spaces/boards",
    );

    expect(patchSpy).toHaveBeenCalledWith("/boards/board%2Fwith%20spaces", {
      name: "Development",
    });
  });

  it("propagates forbidden errors", async () => {
    const error = new ApiError(403, "FORBIDDEN", "Access denied.");

    vi.spyOn(httpClient, "delete").mockRejectedValue(error);

    await expect(deleteBoard("board-1")).rejects.toBe(error);
  });

  it("propagates not-found errors", async () => {
    const error = new ApiError(404, "NOT_FOUND", "Board not found.");

    vi.spyOn(httpClient, "get").mockRejectedValue(error);

    await expect(getBoards("missing")).rejects.toBe(error);
  });
});
