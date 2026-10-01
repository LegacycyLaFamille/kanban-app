import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "@testing-library/react";
import { Reshaped } from "reshaped";

import { getMyTasks } from "../api/myTasks.api";
import type { MyTask } from "../types/myTasks.types";

import { MyTasksPage } from "./MyTasksPage";

vi.mock("../api/myTasks.api", () => ({
  getMyTasks: vi.fn(),
}));

function renderPage() {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <MyTasksPage />
    </Reshaped>,
  );
}

const tasks: MyTask[] = [
  {
    id: "task-1",
    title: "Write copy",
    description: "",
    projectId: "proj-1",
    status: "TODO",
    priority: "Medium",
    deadline: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    boardId: null,
    assigneeId: "user-1",
    project: { id: "proj-1", name: "Marketing Site" },
  },
  {
    id: "task-2",
    title: "Fix crash on launch",
    description: "",
    projectId: "proj-2",
    status: "IN_PROGRESS",
    priority: "High",
    deadline: "2026-10-05T00:00:00.000Z",
    createdAt: "2026-09-01T00:00:00.000Z",
    boardId: null,
    assigneeId: "user-1",
    project: { id: "proj-2", name: "Mobile App" },
  },
  {
    id: "task-3",
    title: "Review PR",
    description: "",
    projectId: "proj-1",
    status: "DONE",
    priority: "Low",
    deadline: null,
    createdAt: "2026-09-02T00:00:00.000Z",
    boardId: null,
    assigneeId: "user-1",
    project: { id: "proj-1", name: "Marketing Site" },
  },
];

describe("MyTasksPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and renders the current user's tasks grouped by project", async () => {
    vi.mocked(getMyTasks).mockResolvedValue(tasks);

    renderPage();

    expect(await screen.findByText("Marketing Site")).toBeTruthy();
    expect(screen.getByText("Mobile App")).toBeTruthy();
    expect(screen.getByText("Write copy")).toBeTruthy();
    expect(screen.getByText("Fix crash on launch")).toBeTruthy();
    expect(screen.getByText("Review PR")).toBeTruthy();
    expect(getMyTasks).toHaveBeenCalledTimes(1);
  });

  it("groups multiple tasks from the same project together", async () => {
    vi.mocked(getMyTasks).mockResolvedValue(tasks);

    renderPage();

    await screen.findByText("Marketing Site");

    expect(screen.getByText("2 tasks")).toBeTruthy();
    expect(screen.getByText("1 task")).toBeTruthy();
  });

  it("names each task table after its project (RGAA 5.4)", async () => {
    vi.mocked(getMyTasks).mockResolvedValue(tasks);

    renderPage();

    await screen.findByText("Marketing Site");

    expect(screen.getByRole("table", { name: "Marketing Site" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Mobile App" })).toBeTruthy();
  });

  it("shows a clear empty state when there are no assigned tasks", async () => {
    vi.mocked(getMyTasks).mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText("You have no tasks assigned to you right now."),
    ).toBeTruthy();
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(getMyTasks).mockRejectedValue(new Error("network down"));

    renderPage();

    expect(
      await screen.findByText("Unable to load your tasks. Please try again."),
    ).toBeTruthy();
  });
});
