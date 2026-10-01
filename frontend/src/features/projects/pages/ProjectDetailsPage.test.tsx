import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { Reshaped } from "reshaped";

import { MemoryRouter, Route, Routes } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import { useBoards } from "../hooks/useBoards";
import { useProjectDetails } from "../hooks/useProjectDetails";

import type { ProjectBoard, ProjectResponse } from "../types/project-api.types";

import { ProjectDetailsPage } from "./ProjectDetailsPage";

vi.mock("../../auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useBoards", () => ({
  useBoards: vi.fn(),
}));

vi.mock("../hooks/useProjectDetails", () => ({
  useProjectDetails: vi.fn(),
}));

const board: ProjectBoard = {
  id: "board-1",
  name: "Development",
  projectId: "project-1",
  createdAt: "2026-09-26T15:00:00.000Z",
};

const project: ProjectResponse = {
  id: "project-1",
  name: "Kanban",
  description: "Project management",
  ownerId: "user-1",
  createdAt: "2026-09-26T15:00:00.000Z",
  boards: [board],
};

describe("ProjectDetailsPage", () => {
  const saveProject = vi.fn();
  const removeProject = vi.fn();
  const reloadProject = vi.fn();
  const resetProjectError = vi.fn();

  const createBoard = vi.fn();
  const updateBoard = vi.fn();
  const deleteBoard = vi.fn();
  const reloadBoards = vi.fn();
  const resetBoardError = vi.fn();

  beforeAll(() => {
    vi.stubGlobal("matchMedia", (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn().mockReturnValue(false),
    }));
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.resetAllMocks();

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
      deleteAccount: vi.fn(),
    });

    vi.mocked(useProjectDetails).mockReturnValue({
      project,
      isLoading: false,
      notFound: false,
      error: null,
      isSaving: false,
      isDeleting: false,
      mutationError: null,
      reload: reloadProject,
      saveProject,
      removeProject,
      resetMutationError: resetProjectError,
    });

    vi.mocked(useBoards).mockReturnValue({
      boards: [board],
      isLoading: false,
      error: null,
      isMutating: false,
      mutationError: null,
      reload: reloadBoards,
      createBoard,
      updateBoard,
      deleteBoard,
      resetMutationError: resetBoardError,
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

  it("displays the project and its boards", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Kanban" })).toBeTruthy();

    expect(screen.getAllByText("Project management")).toHaveLength(2);

    expect(
      screen.getByText("Development", { selector: "strong" }),
    ).toBeTruthy();
  });

  it("requires confirmation before deleting a project", async () => {
    const user = userEvent.setup();

    removeProject.mockResolvedValue(true);

    renderPage();

    await user.click(screen.getByRole("button", { name: "Delete project" }));

    expect(removeProject).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));

    await waitFor(() => {
      expect(removeProject).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Project list target")).toBeTruthy();
  });

  it("does not redirect if project deletion fails", async () => {
    const user = userEvent.setup();

    removeProject.mockResolvedValue(false);

    renderPage();

    await user.click(screen.getByRole("button", { name: "Delete project" }));

    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));

    await waitFor(() => {
      expect(removeProject).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("Project list target")).toBeNull();
  });

  it("creates a board in the selected project", async () => {
    const user = userEvent.setup();

    createBoard.mockResolvedValue({
      ...board,
      id: "board-2",
      name: "Backlog",
    });

    renderPage();

    await user.click(screen.getByRole("button", { name: "+ New board" }));

    await user.type(
      screen.getByRole("textbox", { name: "Board name" }),
      "Backlog",
    );

    await user.click(screen.getByRole("button", { name: "Create board" }));

    await waitFor(() => {
      expect(createBoard).toHaveBeenCalledWith({
        name: "Backlog",
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole("textbox", { name: "Board name" })).toBeNull();
    });
  });

  it("keeps the creation form open if the API refuses", async () => {
    const user = userEvent.setup();

    createBoard.mockResolvedValue(null);

    renderPage();

    await user.click(screen.getByRole("button", { name: "+ New board" }));

    await user.type(
      screen.getByRole("textbox", { name: "Board name" }),
      "Backlog",
    );

    await user.click(screen.getByRole("button", { name: "Create board" }));

    await waitFor(() => {
      expect(createBoard).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("textbox", { name: "Board name" })).toBeTruthy();
  });

  it("renames an existing board", async () => {
    const user = userEvent.setup();

    updateBoard.mockResolvedValue({
      ...board,
      name: "Backlog",
    });

    renderPage();

    await user.click(
      screen.getByRole("button", {
        name: /^Rename\s*Development$/,
      }),
    );

    const input = screen.getByRole("textbox", {
      name: "Board name",
    });

    await user.clear(input);
    await user.type(input, "Backlog");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateBoard).toHaveBeenCalledWith("board-1", {
        name: "Backlog",
      });
    });
  });

  it("requires confirmation before deleting a board", async () => {
    const user = userEvent.setup();

    deleteBoard.mockResolvedValue(true);

    renderPage();

    await user.click(
      screen.getByRole("button", {
        name: /^Delete\s*Development$/,
      }),
    );

    expect(deleteBoard).not.toHaveBeenCalled();

    expect(screen.getByText('Delete board "Development"?')).toBeTruthy();

    await user.click(
      screen.getByRole("button", {
        name: "Confirm board deletion",
      }),
    );

    await waitFor(() => {
      expect(deleteBoard).toHaveBeenCalledWith("board-1");
    });

    await waitFor(() => {
      expect(screen.queryByText('Delete board "Development"?')).toBeNull();
    });
  });

  it("keeps the confirmation visible when deletion fails", async () => {
    const user = userEvent.setup();

    deleteBoard.mockResolvedValue(false);

    renderPage();

    await user.click(
      screen.getByRole("button", {
        name: /^Delete\s*Development$/,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: "Confirm board deletion",
      }),
    );

    await waitFor(() => {
      expect(deleteBoard).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Delete board "Development"?')).toBeTruthy();
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
      deleteAccount: vi.fn(),
    });

    renderPage();

    expect(screen.queryByRole("button", { name: "Edit project" })).toBeNull();

    expect(screen.queryByRole("button", { name: "Delete project" })).toBeNull();

    expect(screen.queryByRole("button", { name: "+ New board" })).toBeNull();

    expect(
      screen.queryByRole("button", {
        name: /^Rename\s*Development$/,
      }),
    ).toBeNull();

    expect(
      screen.queryByRole("button", {
        name: /^Delete\s*Development$/,
      }),
    ).toBeNull();
  });
});
