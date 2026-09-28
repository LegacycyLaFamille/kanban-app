import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../../shared/api";

import { getProject } from "./projects.api";
import { getProjectById } from "./project-details.api";

import type { ProjectResponse } from "../types/project-api.types";

vi.mock("./projects.api", () => ({
  getProject: vi.fn(),
}));

const project: ProjectResponse = {
  id: "project-1",
  name: "Kanban",
  description: "Project management",
  ownerId: "user-1",
  createdAt: "2026-09-26T15:00:00.000Z",
  boards: [],
};

describe("project-details.api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("retrieves the requested project", async () => {
    vi.mocked(getProject).mockResolvedValue(project);

    const result = await getProjectById("project-1");

    expect(getProject).toHaveBeenCalledExactlyOnceWith("project-1");
    expect(result).toEqual(project);
  });

  it("preserves an empty boards list", async () => {
    vi.mocked(getProject).mockResolvedValue(project);

    const result = await getProjectById("project-1");

    expect(result?.boards).toEqual([]);
  });

  it("returns null when the project does not exist", async () => {
    vi.mocked(getProject).mockRejectedValue(
      new ApiError(404, "NOT_FOUND", "Project not found."),
    );

    const result = await getProjectById("missing-project");

    expect(result).toBeNull();
  });

  it("propagates forbidden errors", async () => {
    const error = new ApiError(403, "FORBIDDEN", "Access denied.");

    vi.mocked(getProject).mockRejectedValue(error);

    await expect(getProjectById("project-1")).rejects.toBe(error);
  });

  it("propagates unexpected errors", async () => {
    const error = new Error("Network unavailable");

    vi.mocked(getProject).mockRejectedValue(error);

    await expect(getProjectById("project-1")).rejects.toBe(error);
  });
});
