import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, httpClient } from "../../../shared/api";

import type { ProjectResponse } from "../types/project-api.types";

import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
} from "./projects.api";

const project: ProjectResponse = {
  id: "project-1",
  name: "Kanban",
  description: "Project management",
  ownerId: "user-1",
  createdAt: "2026-09-26T15:00:00.000Z",
  boards: [],
};

describe("projects.api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads projects", async () => {
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue([project]);

    const result = await getProjects();

    expect(getSpy).toHaveBeenCalledWith("/projects");
    expect(result).toEqual([project]);
  });

  it("loads a project by ID", async () => {
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue(project);

    const result = await getProject(project.id);

    expect(getSpy).toHaveBeenCalledWith("/projects/project-1");
    expect(result).toEqual(project);
  });

  it("creates a project", async () => {
    const payload = {
      name: "Kanban",
      description: "Project management",
    };

    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(project);

    const result = await createProject(payload);

    expect(postSpy).toHaveBeenCalledWith("/projects", payload);
    expect(result).toEqual(project);
  });

  it("updates a project", async () => {
    const payload = {
      name: "Updated Kanban",
    };

    const updatedProject = {
      ...project,
      ...payload,
    };

    const patchSpy = vi
      .spyOn(httpClient, "patch")
      .mockResolvedValue(updatedProject);

    const result = await updateProject(project.id, payload);

    expect(patchSpy).toHaveBeenCalledWith("/projects/project-1", payload);
    expect(result).toEqual(updatedProject);
  });

  it("deletes a project", async () => {
    const deleteSpy = vi
      .spyOn(httpClient, "delete")
      .mockResolvedValue(undefined);

    await deleteProject(project.id);

    expect(deleteSpy).toHaveBeenCalledWith("/projects/project-1");
  });

  it("encodes project IDs", async () => {
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue(project);

    await getProject("project/with spaces");

    expect(getSpy).toHaveBeenCalledWith("/projects/project%2Fwith%20spaces");
  });

  it("propagates forbidden errors", async () => {
    const error = new ApiError(403, "FORBIDDEN", "Access denied.");

    vi.spyOn(httpClient, "delete").mockRejectedValue(error);

    await expect(deleteProject(project.id)).rejects.toBe(error);
  });

  it("propagates not-found errors", async () => {
    const error = new ApiError(404, "NOT_FOUND", "Project not found.");

    vi.spyOn(httpClient, "get").mockRejectedValue(error);

    await expect(getProject("missing")).rejects.toBe(error);
  });
});
