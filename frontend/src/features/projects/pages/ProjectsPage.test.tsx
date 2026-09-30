import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Reshaped } from "reshaped";

import { MemoryRouter, Route, Routes } from "react-router-dom";

import { useProjects } from "../hooks/useProjects";

import type { ProjectResponse } from "../types/project-api.types";

import { ProjectsPage } from "./ProjectsPage";

vi.mock("../hooks/useProjects", () => ({
  useProjects: vi.fn(),
}));

const project: ProjectResponse = {
  id: "project-1",
  name: "Kanban",
  description: "Project management",
  ownerId: "user-1",
  createdAt: "2026-09-26T15:00:00.000Z",
  boards: [],
};

describe("ProjectsPage", () => {
  const createProject = vi.fn();
  const reload = vi.fn();
  const resetMutationError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useProjects).mockReturnValue({
      projects: [project],
      isLoading: false,
      isCreating: false,
      error: null,
      mutationError: null,
      reload,
      createProject,
      resetMutationError,
    });
  });

  function renderPage() {
    return render(
      <Reshaped theme="slate" defaultColorMode="dark">
        <MemoryRouter initialEntries={["/projects"]}>
          <Routes>
            <Route path="/projects" element={<ProjectsPage />} />
            <Route
              path="/projects/:projectId"
              element={<div>Project detail target</div>}
            />
          </Routes>
        </MemoryRouter>
      </Reshaped>,
    );
  }

  it("displays projects returned by the hook", () => {
    renderPage();

    expect(
      screen.getByRole("link", { name: "Open project Kanban" }),
    ).toBeTruthy();
  });

  it("filters projects by name", async () => {
    const user = userEvent.setup();

    renderPage();

    await user.type(
      screen.getByRole("searchbox", { name: "Search projects" }),
      "something else",
    );

    expect(
      screen.queryByRole("link", { name: "Open project Kanban" }),
    ).toBeNull();

    expect(screen.getByText("No projects match your search.")).toBeTruthy();
  });

  it("opens the created project after a successful POST", async () => {
    const user = userEvent.setup();

    const createdProject: ProjectResponse = {
      ...project,
      id: "project-2",
      name: "New project",
    };

    createProject.mockResolvedValue(createdProject);

    renderPage();

    await user.click(screen.getByRole("button", { name: "+ New Project" }));

    await user.type(screen.getByLabelText("Project name"), "New project");

    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith({
        name: "New project",
        description: "",
      });
    });

    expect(await screen.findByText("Project detail target")).toBeTruthy();
  });

  it("does not navigate when project creation fails", async () => {
    const user = userEvent.setup();

    createProject.mockResolvedValue(null);

    renderPage();

    await user.click(screen.getByRole("button", { name: "+ New Project" }));

    await user.type(screen.getByLabelText("Project name"), "New project");

    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("Project detail target")).toBeNull();

    expect(screen.getByLabelText("Project name")).toBeTruthy();
  });
});
