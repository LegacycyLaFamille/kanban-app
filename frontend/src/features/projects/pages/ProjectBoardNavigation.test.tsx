import { render, screen } from "@testing-library/react";
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

const boardA: ProjectBoard = {
  id: "board-a",
  name: "Development",
  projectId: "project-1",
  createdAt: "2026-09-26T15:00:00.000Z",
};

const boardB: ProjectBoard = {
  id: "board-b",
  name: "Planning",
  projectId: "project-1",
  createdAt: "2026-09-26T15:00:00.000Z",
};

const project: ProjectResponse = {
  id: "project-1",
  name: "Kanban",
  description: "Project management",
  ownerId: "user-1",
  createdAt: "2026-09-26T15:00:00.000Z",
  boards: [boardA, boardB],
};

describe("Project board navigation", () => {
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
    });

    vi.mocked(useProjectDetails).mockReturnValue({
      project,
      isLoading: false,
      notFound: false,
      error: null,
      isSaving: false,
      isDeleting: false,
      mutationError: null,
      reload: vi.fn(),
      saveProject: vi.fn(),
      removeProject: vi.fn(),
      resetMutationError: vi.fn(),
    });

    vi.mocked(useBoards).mockReturnValue({
      boards: [boardA, boardB],
      isLoading: false,
      error: null,
      isMutating: false,
      mutationError: null,
      reload: vi.fn(),
      createBoard: vi.fn(),
      updateBoard: vi.fn(),
      deleteBoard: vi.fn(),
      resetMutationError: vi.fn(),
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
            <Route
              path="/projects/:projectId/boards/:boardId/kanban"
              element={<div>Selected board route</div>}
            />
          </Routes>
        </MemoryRouter>
      </Reshaped>,
    );
  }

  it("opens exactly the clicked board and removes the global Open board button", async () => {
    const user = userEvent.setup();

    renderPage();

    expect(screen.getByText("2 boards")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open board" })).toBeNull();

    const link = screen.getByRole("link", { name: "Open board Planning" });

    expect(link.getAttribute("href")).toBe(
      "/projects/project-1/boards/board-b/kanban",
    );

    await user.click(link);

    expect(screen.getByText("Selected board route")).toBeTruthy();
  });
  it("does not navigate when using a board management action", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", { name: /^Rename\s*Development$/ }),
    );

    expect(screen.getByRole("textbox", { name: "Board name" })).toBeTruthy();
    expect(screen.queryByText("Selected board route")).toBeNull();
  });

  it("allows an empty project to have no board links", () => {
    vi.mocked(useBoards).mockReturnValue({
      ...vi.mocked(useBoards)("project-1"),
      boards: [],
    });

    renderPage();

    expect(screen.getByText("No boards yet.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /^Open board / })).toBeNull();
  });
});
