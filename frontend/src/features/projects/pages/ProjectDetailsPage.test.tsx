import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Reshaped } from "reshaped";

import { MemoryRouter, Route, Routes } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import { useProjectDetails } from "../hooks/useProjectDetails";

import type { ProjectResponse } from "../types/project-api.types";

import { ProjectDetailsPage } from "./ProjectDetailsPage";

vi.mock("../../auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useProjectDetails", () => ({
  useProjectDetails: vi.fn(),
}));

const project: ProjectResponse = {
  id: "project-1",
  name: "Kanban",
  description: "Project management",
  ownerId: "user-1",
  createdAt: "2026-09-26T15:00:00.000Z",
  boards: [],
};

describe("ProjectDetailsPage", () => {
  const saveProject = vi.fn();
  const removeProject = vi.fn();
  const reload = vi.fn();
  const resetMutationError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "user-1",
        name: "Project Owner",
        email: "owner@example.com",
      },
      isAuthenticated: true,
      isInitializing: false,
      sessionError: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.mocked(useProjectDetails).mockReturnValue({
      project,
      isLoading: false,
      notFound: false,
      error: null,
      isSaving: false,
      isDeleting: false,
      mutationError: null,
      reload,
      saveProject,
      removeProject,
      resetMutationError,
    });
  });

  function renderPage() {
    return render(
      <Reshaped theme="slate" defaultColorMode="dark">
        <MemoryRouter initialEntries={["/projects/project-1"]}>
          <Routes>
            <Route
              path="/projects/:projectId"
              element={<ProjectDetailsPage />}
            />

            <Route path="/projects" element={<div>Project list target</div>} />
          </Routes>
        </MemoryRouter>
      </Reshaped>,
    );
  }

  it("displays project information", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Kanban" })).toBeTruthy();

    expect(screen.getAllByText("Project management")).toHaveLength(2);
  });

  it("requires confirmation before deleting a project", async () => {
    const user = userEvent.setup();

    removeProject.mockResolvedValue(true);

    renderPage();

    await user.click(screen.getByRole("button", { name: "Delete project" }));

    expect(removeProject).not.toHaveBeenCalled();

    expect(screen.getByText("Delete project?")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));

    await waitFor(() => {
      expect(removeProject).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Project list target")).toBeTruthy();
  });

  it("does not redirect when deletion fails", async () => {
    const user = userEvent.setup();

    removeProject.mockResolvedValue(false);

    renderPage();

    await user.click(screen.getByRole("button", { name: "Delete project" }));

    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));

    await waitFor(() => {
      expect(removeProject).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("Project list target")).toBeNull();

    expect(
      screen.getByRole("button", { name: "Confirm deletion" }),
    ).toBeTruthy();
  });

  it("hides management actions from non-owners", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "another-user",
        name: "Another User",
        email: "another@example.com",
      },
      isAuthenticated: true,
      isInitializing: false,
      sessionError: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderPage();

    expect(screen.queryByRole("button", { name: "Edit project" })).toBeNull();

    expect(screen.queryByRole("button", { name: "Delete project" })).toBeNull();
  });
});
