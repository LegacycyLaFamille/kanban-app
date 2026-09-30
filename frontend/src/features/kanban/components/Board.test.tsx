import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Reshaped } from "reshaped";

import { createTask, getTasksByProject, updateTask } from "../api/tasks.api";
import type { Task as BackendTask } from "../types/task.types";
import type { ColumnId, Task as FrontendTask } from "../types";
import { Board } from "./Board";

vi.mock("../api/tasks.api", () => ({
  getTasksByProject: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

// Column owns real react-dnd drag targets, which jsdom cannot drive without
// a dedicated DnD test backend. Board's contract with Column is the
// `onDropTask`/`isTaskPending` props, so this stub exposes those directly
// as clickable controls instead of simulating native drag gestures.
vi.mock("./Column", () => ({
  Column: ({
    columnId,
    tasks,
    onDropTask,
    isTaskPending,
  }: {
    columnId: ColumnId;
    tasks: FrontendTask[];
    onDropTask: (taskId: string, targetColumnId: ColumnId) => void;
    isTaskPending?: (taskId: string) => boolean;
  }) => (
    <div data-testid={`column-${columnId}`}>
      {tasks.map((task) => (
        <div key={task.id} data-task-id={task.id}>
          <span>{task.title}</span>
          <span data-testid={`pending-${task.id}`}>
            {isTaskPending?.(task.id) ? "pending" : "idle"}
          </span>
          <button onClick={() => onDropTask(task.id, "in-progress")}>
            Move {task.title} to in-progress
          </button>
          <button onClick={() => onDropTask(task.id, "done")}>
            Move {task.title} to done
          </button>
        </div>
      ))}
    </div>
  ),
}));

function renderBoard() {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <Board projectId="project-1" />
    </Reshaped>,
  );
}

const task: BackendTask = {
  id: "task-1",
  title: "Design the login page",
  description: "",
  priority: "Low",
  status: "TODO",
  projectId: "project-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("Board", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches tasks from the backend rather than using mock data", async () => {
    vi.mocked(getTasksByProject).mockResolvedValue([task]);

    renderBoard();

    expect(await screen.findByText(task.title)).toBeTruthy();
    expect(getTasksByProject).toHaveBeenCalledWith("project-1");
  });

  it("persists a drop by calling the API with the right payload and moves the card immediately", async () => {
    const user = userEvent.setup();
    vi.mocked(getTasksByProject)
      .mockResolvedValueOnce([task])
      .mockResolvedValueOnce([{ ...task, status: "DONE" }]);
    vi.mocked(updateTask).mockResolvedValue({ ...task, status: "DONE" });

    renderBoard();
    await screen.findByText(task.title);

    await user.click(
      screen.getByRole("button", {
        name: `Move ${task.title} to done`,
      }),
    );

    expect(updateTask).toHaveBeenCalledWith(task.id, { status: "DONE" });

    await waitFor(() => {
      const doneColumn = screen.getByTestId("column-done");
      expect(doneColumn.textContent).toContain(task.title);
    });
  });

  it("rolls back to the original column and shows an error when the API call fails", async () => {
    const user = userEvent.setup();
    vi.mocked(getTasksByProject).mockResolvedValue([task]);
    vi.mocked(updateTask).mockRejectedValue(new Error("network down"));

    renderBoard();
    await screen.findByText(task.title);

    await user.click(
      screen.getByRole("button", {
        name: `Move ${task.title} to done`,
      }),
    );

    expect(
      await screen.findByText("Unable to move task. Please try again."),
    ).toBeTruthy();

    const todoColumn = screen.getByTestId("column-todo");
    expect(todoColumn.textContent).toContain(task.title);

    const doneColumn = screen.getByTestId("column-done");
    expect(doneColumn.textContent).not.toContain(task.title);
  });

  it("marks a task pending while its move is in flight and ignores a second drop", async () => {
    const user = userEvent.setup();
    vi.mocked(getTasksByProject).mockResolvedValue([task]);

    let resolveUpdate!: (value: BackendTask) => void;
    vi.mocked(updateTask).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    renderBoard();
    await screen.findByText(task.title);

    await user.click(
      screen.getByRole("button", {
        name: `Move ${task.title} to in-progress`,
      }),
    );

    expect(screen.getByTestId(`pending-${task.id}`).textContent).toBe(
      "pending",
    );

    // A second drop attempt while the first is still in flight must not
    // fire a second request for the same task.
    await user.click(
      screen.getByRole("button", {
        name: `Move ${task.title} to done`,
      }),
    );
    expect(updateTask).toHaveBeenCalledTimes(1);

    resolveUpdate({ ...task, status: "IN_PROGRESS" });

    await waitFor(() => {
      expect(screen.getByTestId(`pending-${task.id}`).textContent).toBe("idle");
    });
  });

  it("reflects the persisted status after the board remounts", async () => {
    const user = userEvent.setup();
    vi.mocked(getTasksByProject)
      .mockResolvedValueOnce([task])
      .mockResolvedValueOnce([{ ...task, status: "DONE" }])
      .mockResolvedValueOnce([{ ...task, status: "DONE" }]);
    vi.mocked(updateTask).mockResolvedValue({ ...task, status: "DONE" });

    const { unmount } = renderBoard();
    await screen.findByText(task.title);

    await user.click(
      screen.getByRole("button", {
        name: `Move ${task.title} to done`,
      }),
    );

    await waitFor(() => {
      expect(getTasksByProject).toHaveBeenCalledTimes(2);
    });

    unmount();
    renderBoard();

    await screen.findByText(task.title);
    expect(screen.getByTestId("column-done").textContent).toContain(task.title);
    expect(screen.getByTestId("column-todo").textContent).not.toContain(
      task.title,
    );
  });

  it("shows a validation error and does not call the API when the task title is empty", async () => {
    const user = userEvent.setup();
    vi.mocked(getTasksByProject).mockResolvedValue([]);

    renderBoard();
    await screen.findByRole("button", { name: "+ Add Task" });

    await user.click(screen.getByRole("button", { name: "+ Add Task" }));
    await user.click(screen.getByRole("button", { name: "Create Task" }));

    expect(await screen.findByText("Task title is required.")).toBeTruthy();
    expect(createTask).not.toHaveBeenCalled();
  });
});
