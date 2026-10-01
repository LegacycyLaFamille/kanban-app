import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Reshaped } from "reshaped";

import { getProjectTeam } from "../../projects/api/team.api";
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

vi.mock("../../projects/api/team.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../projects/api/team.api")>()),
  getProjectTeam: vi.fn().mockResolvedValue({ owner: null, members: [] }),
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

function renderBoard(currentUserId?: string) {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <Board projectId="project-1" currentUserId={currentUserId} />
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

  it("shows a loading state until the tasks are fetched", async () => {
    vi.mocked(getTasksByProject).mockResolvedValue([task]);

    renderBoard();

    expect(screen.getByRole("status", { name: "Loading tasks" })).toBeTruthy();

    await screen.findByText(task.title);

    expect(screen.queryByRole("status", { name: "Loading tasks" })).toBeNull();
  });

  it("replaces the board with an error and recovers on retry", async () => {
    const user = userEvent.setup();
    vi.mocked(getTasksByProject)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce([task]);

    renderBoard();

    expect(
      await screen.findByText("Unable to load tasks. Please try again."),
    ).toBeTruthy();
    expect(screen.queryByTestId("column-todo")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText(task.title)).toBeTruthy();
  });

  it("invites the user to create a task when the board is empty", async () => {
    const user = userEvent.setup();
    vi.mocked(getTasksByProject).mockResolvedValue([]);

    renderBoard();

    expect(await screen.findByText("No tasks yet")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Create a task" }));

    expect(await screen.findByPlaceholderText("Task title...")).toBeTruthy();
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

    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Create Task" }),
    );

    expect(await screen.findByText("Task title is required.")).toBeTruthy();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("creates a task assigned to the member picked in the dropdown", async () => {
    const user = userEvent.setup();
    vi.mocked(getTasksByProject).mockResolvedValue([]);
    vi.mocked(getProjectTeam).mockResolvedValue({
      owner: { userId: "owner-1", name: "Alice", email: "alice@example.com" },
      members: [
        {
          id: "m-1",
          userId: "member-1",
          name: "Bob",
          email: "bob@example.com",
          joinedAt: "2026-09-01T00:00:00.000Z",
          role: "VIEWER",
        },
      ],
    });
    vi.mocked(createTask).mockResolvedValue(task);

    renderBoard();
    await user.click(await screen.findByRole("button", { name: "+ Add Task" }));

    await user.type(screen.getByPlaceholderText("Task title..."), "Write docs");
    // Wait for the team to load, then open the dropdown and pick Bob.
    await waitFor(() => expect(getProjectTeam).toHaveBeenCalled());
    const assignee = screen.getByRole("combobox", { name: "Assignee" });
    expect(await within(assignee).findByText("Alice (owner)")).toBeTruthy();
    await user.selectOptions(assignee, "Bob");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Create Task",
      }),
    );

    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith(
        "project-1",
        expect.objectContaining({
          title: "Write docs",
          assigneeId: "member-1",
        }),
      );
    });
    // Types text and drives a dropdown: slow under a full parallel run.
  }, 15_000);

  it("shows only the tasks of the opened board, under its name", async () => {
    vi.mocked(getTasksByProject).mockResolvedValue([
      { ...task, boardId: "board-1" },
      { ...task, id: "task-2", title: "Other board task", boardId: "board-2" },
      { ...task, id: "task-3", title: "Task without board", boardId: null },
    ]);

    render(
      <Reshaped theme="slate" defaultColorMode="dark">
        <Board projectId="project-1" boardId="board-1" boardName="Sprint 1" />
      </Reshaped>,
    );

    expect(await screen.findByText(task.title)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Sprint 1" })).toBeTruthy();
    expect(screen.queryByText("Other board task")).toBeNull();
    expect(screen.queryByText("Task without board")).toBeNull();
  });

  it("creates the task on the opened board", async () => {
    const user = userEvent.setup();
    vi.mocked(getTasksByProject).mockResolvedValue([]);
    vi.mocked(createTask).mockResolvedValue(task);

    render(
      <Reshaped theme="slate" defaultColorMode="dark">
        <Board projectId="project-1" boardId="board-1" />
      </Reshaped>,
    );
    await user.click(await screen.findByRole("button", { name: "+ Add Task" }));
    await user.type(screen.getByPlaceholderText("Task title..."), "Write docs");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Create Task",
      }),
    );

    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith(
        "project-1",
        expect.objectContaining({ title: "Write docs", boardId: "board-1" }),
      );
    });
  }, 15_000);

  it("hides editing controls from a VIEWER member", async () => {
    vi.mocked(getTasksByProject).mockResolvedValue([task]);
    vi.mocked(getProjectTeam).mockResolvedValue({
      owner: { userId: "owner-1", name: "Alice", email: "alice@example.com" },
      members: [
        {
          id: "m-1",
          userId: "viewer-1",
          name: "Bob",
          email: "bob@example.com",
          joinedAt: "2026-09-01T00:00:00.000Z",
          role: "VIEWER",
        },
      ],
    });

    renderBoard("viewer-1");

    expect(await screen.findByText("Read-only access")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "+ Add Task" })).toBeNull();
  });

  it("keeps editing controls for an EDITOR member", async () => {
    vi.mocked(getTasksByProject).mockResolvedValue([task]);
    vi.mocked(getProjectTeam).mockResolvedValue({
      owner: { userId: "owner-1", name: "Alice", email: "alice@example.com" },
      members: [
        {
          id: "m-1",
          userId: "editor-1",
          name: "Bob",
          email: "bob@example.com",
          joinedAt: "2026-09-01T00:00:00.000Z",
          role: "EDITOR",
        },
      ],
    });

    renderBoard("editor-1");

    await waitFor(() => expect(getProjectTeam).toHaveBeenCalled());
    expect(
      await screen.findByRole("button", { name: "+ Add Task" }),
    ).toBeTruthy();
    expect(screen.queryByText("Read-only access")).toBeNull();
  });
});
