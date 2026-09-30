import { act, renderHook, waitFor } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../../shared/api";

import { deleteProject, getProject, updateProject } from "../api/projects.api";

import type { ProjectResponse } from "../types/project-api.types";

import { useProjectDetails } from "./useProjectDetails";

vi.mock("../api/projects.api", () => ({
  getProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

const project: ProjectResponse = {
  id: "project-1",
  name: "Kanban",
  description: "Project management",
  ownerId: "user-1",
  createdAt: "2026-09-26T15:00:00.000Z",
  boards: [],
};

describe("useProjectDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getProject).mockResolvedValue(project);
  });

  it("loads project details", async () => {
    const { result } = renderHook(() => useProjectDetails("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.project).toEqual(project);
    expect(result.current.notFound).toBe(false);
  });

  it("recognizes a missing project", async () => {
    vi.mocked(getProject).mockRejectedValue(
      new ApiError(404, "NOT_FOUND", "Project not found."),
    );

    const { result } = renderHook(() => useProjectDetails("missing"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notFound).toBe(true);
    expect(result.current.project).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("does not treat forbidden access as a missing project", async () => {
    vi.mocked(getProject).mockRejectedValue(
      new ApiError(403, "FORBIDDEN", "Access denied."),
    );

    const { result } = renderHook(() => useProjectDetails("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notFound).toBe(false);
    expect(result.current.project).toBeNull();

    expect(result.current.error).toBe(
      "You do not have permission to perform this action.",
    );
  });

  it("updates local details after a successful PATCH", async () => {
    const updatedProject: ProjectResponse = {
      ...project,
      name: "Updated project",
    };

    vi.mocked(updateProject).mockResolvedValue(updatedProject);

    const { result } = renderHook(() => useProjectDetails("project-1"));

    await waitFor(() => {
      expect(result.current.project).toEqual(project);
    });

    let saved: ProjectResponse | null = null;

    await act(async () => {
      saved = await result.current.saveProject({
        name: "Updated project",
      });
    });

    expect(updateProject).toHaveBeenCalledWith("project-1", {
      name: "Updated project",
    });

    expect(saved).toEqual(updatedProject);
    expect(result.current.project).toEqual(updatedProject);
  });

  it("does not report success when deletion is forbidden", async () => {
    vi.mocked(deleteProject).mockRejectedValue(
      new ApiError(403, "FORBIDDEN", "Access denied."),
    );

    const { result } = renderHook(() => useProjectDetails("project-1"));

    await waitFor(() => {
      expect(result.current.project).toEqual(project);
    });

    let deleted = true;

    await act(async () => {
      deleted = await result.current.removeProject();
    });

    expect(deleted).toBe(false);
    expect(result.current.project).toEqual(project);

    expect(result.current.mutationError).toBe(
      "You do not have permission to perform this action.",
    );
  });

  it("reports success after a successful DELETE", async () => {
    vi.mocked(deleteProject).mockResolvedValue(undefined);

    const { result } = renderHook(() => useProjectDetails("project-1"));

    await waitFor(() => {
      expect(result.current.project).toEqual(project);
    });

    let deleted = false;

    await act(async () => {
      deleted = await result.current.removeProject();
    });

    expect(deleted).toBe(true);
    expect(deleteProject).toHaveBeenCalledWith("project-1");
  });
});
