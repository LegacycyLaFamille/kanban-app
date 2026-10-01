import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { KanbanPage } from "./KanbanPage";

vi.mock("../../auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../components/Board", () => ({
  Board: ({ projectId }: { projectId: string }) => (
    <div>{`board:${projectId}`}</div>
  ),
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

    expect(screen.getByText("board:project-1")).toBeTruthy();
  });

  it("goes back to the project details page", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("link", { name: "Back to project" }));

    expect(screen.getByText("project details")).toBeTruthy();
  });
});
