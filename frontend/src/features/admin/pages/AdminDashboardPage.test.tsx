import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Reshaped } from "reshaped";

import { assignAdminTask, getAdminTasks } from "../api/admin.api";
import type { AdminProjectTasks } from "../types/admin.types";

import { AdminDashboardPage } from "./AdminDashboardPage";

vi.mock("../api/admin.api", () => ({
  getAdminTasks: vi.fn(),
  assignAdminTask: vi.fn(),
}));

function renderPage() {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <AdminDashboardPage />
    </Reshaped>,
  );
}

const groups: AdminProjectTasks[] = [
  {
    projectId: "proj-1",
    projectName: "Marketing Site",
    assignableUsers: [
      { id: "user-1", name: "Alice", email: "alice@example.com" },
      { id: "user-2", name: "Bob", email: "bob@example.com" },
    ],
    tasks: [
      {
        id: "task-1",
        title: "Write copy",
        status: "TODO",
        priority: "Medium",
        deadline: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
        boardId: null,
        assigneeId: null,
        assigneeName: null,
        assigneeEmail: null,
      },
    ],
  },
  {
    projectId: "proj-2",
    projectName: "Mobile App",
    assignableUsers: [{ id: "user-2", name: "Bob", email: "bob@example.com" }],
    tasks: [
      {
        id: "task-2",
        title: "Fix crash on launch",
        status: "IN_PROGRESS",
        priority: "High",
        deadline: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
        boardId: null,
        assigneeId: "user-2",
        assigneeName: "Bob",
        assigneeEmail: "bob@example.com",
      },
    ],
  },
];

describe("AdminDashboardPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and renders tasks grouped by project", async () => {
    vi.mocked(getAdminTasks).mockResolvedValue(groups);

    renderPage();

    expect(await screen.findByText("Marketing Site")).toBeTruthy();
    expect(screen.getByText("Mobile App")).toBeTruthy();
    expect(screen.getByText("Write copy")).toBeTruthy();
    expect(screen.getByText("Fix crash on launch")).toBeTruthy();
    expect(getAdminTasks).toHaveBeenCalledTimes(1);
  });

  it("shows each project's task count", async () => {
    vi.mocked(getAdminTasks).mockResolvedValue(groups);

    renderPage();

    await screen.findByText("Marketing Site");

    const oneTaskLabels = screen.getAllByText("1 task");
    expect(oneTaskLabels.length).toBe(2);
  });

  it("assigns a task to a user via the assignee control", async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminTasks).mockResolvedValue(groups);
    vi.mocked(assignAdminTask).mockResolvedValue({
      id: "task-1",
      assigneeId: "user-1",
    });

    renderPage();
    await screen.findByText("Write copy");

    const row = screen.getByText("Write copy").closest("tr");
    if (!row) throw new Error("Row not found");

    await user.selectOptions(
      within(row).getByRole("combobox", { name: "Assignee for Write copy" }),
      "Alice",
    );

    await waitFor(() => {
      expect(assignAdminTask).toHaveBeenCalledWith("task-1", "user-1");
    });
  });

  it("shows an error and rolls back when assignment fails", async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminTasks).mockResolvedValue(groups);
    vi.mocked(assignAdminTask).mockRejectedValue(new Error("network down"));

    renderPage();
    await screen.findByText("Write copy");

    const row = screen.getByText("Write copy").closest("tr");
    if (!row) throw new Error("Row not found");

    await user.selectOptions(
      within(row).getByRole("combobox", { name: "Assignee for Write copy" }),
      "Alice",
    );

    expect(
      await screen.findByText("Unable to assign task. Please try again."),
    ).toBeTruthy();
  });
});
