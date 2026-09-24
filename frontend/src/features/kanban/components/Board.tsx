import { useState, useCallback, type MouseEvent } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Button, Card, Modal, Text, TextArea, TextField, View } from "reshaped";

import type { ColumnId, Task as FrontendTask } from "../types";
import { Column } from "./Column";
import { useGetTasks } from "../hooks/useGetTasks";
import { useCreateTask } from "../hooks/useCreateTask";
import { useUpdateTask } from "../hooks/useUpdateTask";
import { useDeleteTask } from "../hooks/useDeleteTask";
import type {
  Task as BackendTask,
  TaskStatus,
  TaskPriority,
} from "../types/task.types";

interface BoardProps {
  projectId: string;
}

type FrontendPriority = NonNullable<FrontendTask["priority"]>;

const PRIORITIES: FrontendPriority[] = ["low", "medium", "high"];

const COLUMNS: { id: ColumnId; title: string; backendStatus: TaskStatus }[] = [
  { id: "todo", title: "To Do", backendStatus: "TODO" },
  { id: "in-progress", title: "In Progress", backendStatus: "IN_PROGRESS" },
  { id: "done", title: "Done", backendStatus: "DONE" },
];

// --- Status conversion helpers ---
function toColumnId(status: string | TaskStatus): ColumnId {
  switch (status) {
    case "IN_PROGRESS":
      return "in-progress";
    case "DONE":
      return "done";
    case "TODO":
    default:
      return "todo";
  }
}

function toBackendStatus(columnId: ColumnId): TaskStatus {
  switch (columnId) {
    case "in-progress":
      return "IN_PROGRESS";
    case "done":
      return "DONE";
    case "todo":
    default:
      return "TODO";
  }
}

// --- Priority conversion helpers ---
function toBackendPriority(
  priority?: FrontendTask["priority"],
): TaskPriority | undefined {
  switch (priority) {
    case "low":
      return "Low";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    default:
      return undefined;
  }
}

function toFrontendPriority(
  priority?: TaskPriority | string | null,
): FrontendPriority {
  switch (priority) {
    case "Low":
    case "low":
      return "low";
    case "High":
    case "high":
      return "high";
    case "Medium":
    case "medium":
    default:
      return "medium";
  }
}

function toFrontendTask(task: BackendTask): FrontendTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    projectId: task.projectId,
    columnId: toColumnId(task.status),
    priority: toFrontendPriority(task.priority),
    assignee: { id: "", name: "" },
  };
}

const EMPTY_TASK: FrontendTask = {
  id: "",
  title: "",
  description: "",
  projectId: "",
  columnId: "todo",
  priority: "medium",
  assignee: { id: "", name: "" },
};

export function Board({ projectId }: BoardProps) {
  // API Hooks
  const {
    tasks: backendTasks,
    isLoading,
    error: fetchError,
    refetch,
  } = useGetTasks(projectId);
  const {
    submit: createTask,
    isSubmitting: isCreating,
    error: createError,
  } = useCreateTask();
  const {
    submit: updateTask,
    isSubmitting: isUpdating,
    error: updateError,
  } = useUpdateTask();
  const {
    submit: deleteTask,
    isSubmitting: isDeleting,
    error: deleteError,
  } = useDeleteTask();

  // Local Modal UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<FrontendTask>(EMPTY_TASK);
  const [isEditing, setIsEditing] = useState(false);

  // Map API items to frontend tasks
  const tasks: FrontendTask[] = backendTasks.map(toFrontendTask);

  // Drag and drop task status update
  const handleDropTask = useCallback(
    async (taskId: string, targetColumnId: ColumnId) => {
      const newStatus = toBackendStatus(targetColumnId);
      const success = await updateTask(taskId, { status: newStatus });
      if (success) {
        await refetch();
      }
    },
    [updateTask, refetch],
  );

  const handleOpenCreate = (columnId: ColumnId = "todo") => {
    setActiveTask({
      ...EMPTY_TASK,
      projectId,
      columnId,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: FrontendTask) => {
    setActiveTask({ ...task });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!activeTask.title.trim()) return;

    const payload = {
      title: activeTask.title,
      description: activeTask.description,
      priority: toBackendPriority(activeTask.priority),
      status: toBackendStatus(activeTask.columnId),
    };

    if (isEditing) {
      const updated = await updateTask(activeTask.id, payload);
      if (updated) {
        setIsModalOpen(false);
        await refetch();
      }
    } else {
      const created = await createTask(projectId, payload);
      if (created) {
        setIsModalOpen(false);
        await refetch();
      }
    }
  };

  const handleDelete = async () => {
    const success = await deleteTask(activeTask.id);
    if (success) {
      setIsDeleteModalOpen(false);
      setIsModalOpen(false);
      await refetch();
    }
  };

  const handleColumnClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const cardEl = target.closest<HTMLElement>("[data-task-id]");
    if (cardEl) {
      const taskId = cardEl.getAttribute("data-task-id");
      const found = tasks.find((t) => t.id === taskId);
      if (found) handleOpenEdit(found);
    }
  };

  const currentActionError = createError || updateError || deleteError;

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          width: "100%",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {/* Top App Header */}
        <Card padding={4}>
          <View direction="row" align="center" justify="space-between">
            <View direction="row" align="center" gap={3}>
              <div
                className="auth-logo"
                style={{ width: 36, height: 36, fontSize: 16 }}
              >
                K
              </div>
              <View>
                <Text variant="featured-3" weight="bold">
                  Project Board
                </Text>
                <Text variant="caption-1" color="neutral-faded">
                  Organize. Prioritize. Deliver.
                </Text>
              </View>
            </View>

            <Button
              color="primary"
              size="medium"
              onClick={() => handleOpenCreate()}
            >
              + Add Task
            </Button>
          </View>
        </Card>

        {/* Global Fetch Error Banner */}
        {fetchError && (
          <Card padding={3}>
            <Text color="critical">{fetchError}</Text>
          </Card>
        )}

        {/* Board Columns Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            alignItems: "start",
            width: "100%",
            flex: 1,
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {COLUMNS.map((column) => (
            <div key={column.id} onClick={handleColumnClick}>
              <Column
                columnId={column.id}
                title={column.title}
                tasks={tasks.filter((task) => task.columnId === column.id)}
                onDropTask={handleDropTask}
                onAddTask={() => handleOpenCreate(column.id)}
              />
            </div>
          ))}
        </div>

        {/* Modal: Task Creation and Edition */}
        <Modal
          active={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          size="640px"
        >
          <Card padding={6}>
            <View gap={5}>
              <View direction="row" justify="space-between" align="center">
                <Text variant="featured-3" weight="bold">
                  {isEditing ? "Edit Task" : "Create Task"}
                </Text>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setIsModalOpen(false)}
                >
                  ✕
                </Button>
              </View>

              {currentActionError && (
                <Text color="critical" variant="caption-1">
                  {currentActionError}
                </Text>
              )}

              <View gap={4}>
                {/* Title */}
                <View gap={1}>
                  <Text variant="caption-1" color="neutral-faded">
                    Title
                  </Text>
                  <TextField
                    name="title"
                    placeholder="Task title..."
                    value={activeTask.title}
                    onChange={({ value }) =>
                      setActiveTask((prev) => ({ ...prev, title: value }))
                    }
                  />
                </View>

                {/* Assignee */}
                <View gap={1}>
                  <Text variant="caption-1" color="neutral-faded">
                    Assignee
                  </Text>
                  <TextField
                    name="assignee"
                    placeholder="Assignee name"
                    value={activeTask.assignee?.name ?? ""}
                    onChange={({ value }) =>
                      setActiveTask((prev) => ({
                        ...prev,
                        assignee: {
                          id: prev.assignee?.id || "user",
                          name: value,
                        },
                      }))
                    }
                  />
                </View>

                {/* Priority */}
                <View gap={1}>
                  <Text variant="caption-1" color="neutral-faded">
                    Priority
                  </Text>
                  <View direction="row" gap={2}>
                    {PRIORITIES.map((p) => {
                      const isSelected = activeTask.priority === p;
                      return (
                        <View.Item key={p} grow>
                          <Button
                            size="medium"
                            fullWidth
                            variant={isSelected ? "solid" : "outline"}
                            color={isSelected ? "primary" : "neutral"}
                            onClick={() =>
                              setActiveTask((prev) => ({
                                ...prev,
                                priority: p,
                              }))
                            }
                          >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </Button>
                        </View.Item>
                      );
                    })}
                  </View>
                </View>

                {/* Status Selection */}
                <View gap={1}>
                  <Text variant="caption-1" color="neutral-faded">
                    Status
                  </Text>
                  <View direction="row" gap={2}>
                    {COLUMNS.map((col) => {
                      const isSelected = activeTask.columnId === col.id;
                      return (
                        <View.Item key={col.id} grow>
                          <Button
                            size="medium"
                            fullWidth
                            variant={isSelected ? "solid" : "outline"}
                            color={isSelected ? "primary" : "neutral"}
                            onClick={() =>
                              setActiveTask((prev) => ({
                                ...prev,
                                columnId: col.id,
                              }))
                            }
                          >
                            {col.title}
                          </Button>
                        </View.Item>
                      );
                    })}
                  </View>
                </View>

                {/* Description */}
                <View gap={1}>
                  <Text variant="caption-1" color="neutral-faded">
                    Description
                  </Text>
                  <TextArea
                    name="description"
                    placeholder="Add details about this task..."
                    value={activeTask.description ?? ""}
                    onChange={({ value }) =>
                      setActiveTask((prev) => ({
                        ...prev,
                        description: value,
                      }))
                    }
                  />
                </View>
              </View>

              {/* Bottom Actions */}
              <View direction="row" justify="space-between" align="center">
                <div>
                  {isEditing && (
                    <Button
                      variant="outline"
                      color="critical"
                      disabled={isDeleting || isUpdating}
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      Delete Task
                    </Button>
                  )}
                </div>

                <View direction="row" gap={3}>
                  <Button
                    variant="outline"
                    color="neutral"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    disabled={isCreating || isUpdating}
                    onClick={handleSave}
                  >
                    {isCreating || isUpdating
                      ? "Saving..."
                      : isEditing
                        ? "Save Changes"
                        : "Create Task"}
                  </Button>
                </View>
              </View>
            </View>
          </Card>
        </Modal>

        {/* Modal: Delete Confirmation */}
        <Modal
          active={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          size="420px"
        >
          <Card padding={6}>
            <View gap={4}>
              <View gap={2}>
                <Text variant="featured-3" weight="bold">
                  Delete Task
                </Text>
                <Text color="neutral-faded">
                  Are you sure you want to delete{" "}
                  <strong>"{activeTask.title}"</strong>? This action cannot be
                  undone.
                </Text>
              </View>

              <View direction="row" justify="end" gap={3}>
                <Button
                  variant="outline"
                  color="neutral"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  color="critical"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </Button>
              </View>
            </View>
          </Card>
        </Modal>
      </div>
    </DndProvider>
  );
}
