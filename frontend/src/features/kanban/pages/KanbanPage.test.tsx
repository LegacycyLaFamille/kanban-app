import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { KanbanPage } from "./KanbanPage";

vi.mock("../../auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../components/Board", () => ({
  Board: ({
    projectId,
    boardId,
    boardName,
  }: {
    projectId: string;
    boardId?: string;
    boardName?: string;
  }) => <div>{`board:${projectId}:${boardId}:${boardName}`}</div>,
}));

vi.mock("../../projects/api/boards.api", () => ({
  getBoard: vi.fn().mockResolvedValue({ id: "b-1", name: "Sprint 1" }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/projects/project-1/kanban?boardId=b-1"]}>
      <Routes>
        <Route path="/projects/:projectId/kanban" element={<KanbanPage />} />
        <Route
          path="/projects/:projectId"
          element={<div>project details</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("KanbanPage", () => {
  it("renders the board of the project from the URL", () => {
    renderPage();

    expect(screen.getByText(/^board:project-1:/)).toBeTruthy();
  });

  it("opens the board selected in the URL, with its name", async () => {
    renderPage();

    expect(
      await screen.findByText("board:project-1:b-1:Sprint 1"),
    ).toBeTruthy();
  });

  it("goes back to the project details page", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("link", { name: "Back to project" }));

    expect(screen.getByText("project details")).toBeTruthy();
  });
});
