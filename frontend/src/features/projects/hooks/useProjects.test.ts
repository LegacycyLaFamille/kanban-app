import { act, renderHook, waitFor } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../../shared/api";

import { createProject, getProjects } from "../api/projects.api";

import type { ProjectResponse } from "../types/project-api.types";

import { useProjects } from "./useProjects";

vi.mock("../api/projects.api", () => ({
  getProjects: vi.fn(),
  createProject: vi.fn(),
}));

const project: ProjectResponse = {
  id: "project-1",
  name: "Kanban",
  description: "Project management",
  ownerId: "user-1",
  createdAt: "2026-09-26T15:00:00.000Z",
  boards: [],
};

describe("useProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getProjects).mockResolvedValue([project]);
  });

  it("loads projects from the backend", async () => {
    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.projects).toEqual([project]);
    expect(result.current.error).toBeNull();
  });

  it("exposes a loading error", async () => {
    vi.mocked(getProjects).mockRejectedValue(new Error("Network unavailable"));

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Unable to load projects.");
  });

  it("adds a project after successful creation", async () => {
    const createdProject: ProjectResponse = {
      ...project,
      id: "project-2",
      name: "Second project",
    };

    vi.mocked(createProject).mockResolvedValue(createdProject);

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let created: ProjectResponse | null = null;

    await act(async () => {
      created = await result.current.createProject({
        name: "Second project",
        description: "Another project",
      });
    });

    expect(created).toEqual(createdProject);

    expect(result.current.projects).toEqual([createdProject, project]);

    expect(result.current.mutationError).toBeNull();
  });

  it("does not add a project when creation is forbidden", async () => {
    vi.mocked(createProject).mockRejectedValue(
      new ApiError(403, "FORBIDDEN", "Access denied."),
    );

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let created: ProjectResponse | null = project;

    await act(async () => {
      created = await result.current.createProject({
        name: "Forbidden project",
        description: "",
      });
    });

    expect(created).toBeNull();
    expect(result.current.projects).toEqual([project]);

    expect(result.current.mutationError).toBe(
      "You do not have permission to perform this action.",
    );
  });

  it("reloads the project list", async () => {
    const secondProject: ProjectResponse = {
      ...project,
      id: "project-2",
      name: "Second project",
    };

    vi.mocked(getProjects)
      .mockResolvedValueOnce([project])
      .mockResolvedValueOnce([project, secondProject]);

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.projects).toEqual([project, secondProject]);

    expect(getProjects).toHaveBeenCalledTimes(2);
  });
});
