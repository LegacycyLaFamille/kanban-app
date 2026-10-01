import { useState, useCallback, type CSSProperties } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Button,
  Card,
  FormControl,
  Modal,
  Select,
  Skeleton,
  Text,
  TextArea,
  TextField,
  View,
} from "reshaped";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../shared/components/Feedback";
import { AppLogo } from "../../../shared/components/AppLogo/AppLogo";
import { getPermission } from "../../projects/api/team.api";
import { useProjectTeam } from "../../projects/hooks/useProjectTeam";
import type { TeamUser } from "../../projects/types/team.types";

import type { ColumnId, Task as FrontendTask } from "../types";
import { Column } from "./Column";
import { useGetTasks } from "../hooks/useGetTasks";
import { useCreateTask } from "../hooks/useCreateTask";
import { useUpdateTask } from "../hooks/useUpdateTask";
import { useDeleteTask } from "../hooks/useDeleteTask";
import { useTaskDragAndDrop } from "../hooks/useTaskDragAndDrop";
import { sortByPriority } from "../utils/sortByPriority";
import type {
  Task as BackendTask,
  TaskStatus,
  TaskPriority,
} from "../types/task.types";

interface BoardProps {
  projectId: string;
  // When set, only this board's tasks are shown and new tasks are created on
  // it. Without it, the whole project's tasks are shown.
  boardId?: string;
  boardName?: string;
  // Used to hide editing controls from VIEWER members. When omitted, the
  // board is editable (the API still enforces permissions).
  currentUserId?: string;
}

type FrontendPriority = NonNullable<FrontendTask["priority"]>;

const PRIORITIES: FrontendPriority[] = ["low", "medium", "high"];

const COLUMNS: { id: ColumnId; title: string; backendStatus: TaskStatus }[] = [
  { id: "todo", title: "To Do", backendStatus: "TODO" },
  { id: "in-progress", title: "In Progress", backendStatus: "IN_PROGRESS" },
  { id: "done", title: "Done", backendStatus: "DONE" },
];

const COLUMNS_GRID_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "20px",
  alignItems: "start",
  width: "100%",
};

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

// --- Deadline conversion helpers ---
// The API exchanges ISO 8601 UTC strings (e.g. "2026-09-30T17:35:44.633Z");
// the datetime-local input works with "YYYY-MM-DDTHH:mm" in local time.
function toDateTimeLocalValue(deadline?: string): string {
  if (!deadline) return "";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function toIsoDeadline(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toFrontendTask(
  task: BackendTask,
  teamUsers: TeamUser[],
): FrontendTask {
  const assignee = task.assigneeId
    ? teamUsers.find((user) => user.userId === task.assigneeId)
    : undefined;

  return {
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    projectId: task.projectId,
    columnId: toColumnId(task.status),
    priority: toFrontendPriority(task.priority),
    deadline: task.deadline ?? undefined,
    assignee: task.assigneeId
      ? { id: task.assigneeId, name: assignee?.name ?? "" }
      : undefined,
  };
}

const EMPTY_TASK: FrontendTask = {
  id: "",
  title: "",
  description: "",
  projectId: "",
  columnId: "todo",
  priority: "medium",
  assignee: undefined,
};

export function Board({
  projectId,
  boardId,
  boardName,
  currentUserId,
}: BoardProps) {
  // API Hooks
  const {
    tasks: backendTasks,
    isLoading,
    hasLoaded,
    error: fetchError,
    refetch,
  } = useGetTasks(projectId, boardId);
  // Owner and members: the people a task can be assigned to.
  const { team, users: teamUsers } = useProjectTeam(projectId);
  const permission =
    team && currentUserId ? getPermission(team, currentUserId) : undefined;
  // Read-only only once the team says so, to avoid hiding controls while
  // it loads.
  const readOnly = permission === "viewer" || permission === null;
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
  const {
    getEffectiveStatus,
    isPending: isTaskPending,
    moveTask,
    error: dragError,
  } = useTaskDragAndDrop({
    onPersisted: async () => {
      await refetch();
    },
  });

  // Local Modal UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<FrontendTask>(EMPTY_TASK);
  const [isEditing, setIsEditing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Map API items to frontend tasks, applying any in-flight optimistic status
  const tasks: FrontendTask[] = backendTasks.map((task) =>
    toFrontendTask({ ...task, status: getEffectiveStatus(task) }, teamUsers),
  );

  // Drag and drop task status update: optimistic, with rollback on failure
  // and a per-task pending lock, both handled by useTaskDragAndDrop.
  const handleDropTask = useCallback(
    (taskId: string, targetColumnId: ColumnId) => {
      if (readOnly) return;
      const task = backendTasks.find((t) => t.id === taskId);
      if (!task) return;
      void moveTask(task, toBackendStatus(targetColumnId));
    },
    [backendTasks, moveTask, readOnly],
  );

  const handleOpenCreate = (columnId: ColumnId = "todo") => {
    setActiveTask({
      ...EMPTY_TASK,
      projectId,
      columnId,
    });
    setIsEditing(false);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: FrontendTask) => {
    setActiveTask({ ...task });
    setIsEditing(true);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const trimmedTitle = activeTask.title.trim();

    if (!trimmedTitle) {
      setValidationError("Task title is required.");
      return;
    }

    setValidationError(null);

    const payload = {
      title: trimmedTitle,
      description: activeTask.description,
      priority: toBackendPriority(activeTask.priority),
      status: toBackendStatus(activeTask.columnId),
      deadline: activeTask.deadline ?? null,
      assigneeId: activeTask.assignee?.id || null,
    };

    if (isEditing) {
      const updated = await updateTask(activeTask.id, payload);
      if (updated) {
        setIsModalOpen(false);
        await refetch();
      }
    } else {
      const created = await createTask(projectId, {
        ...payload,
        boardId: boardId ?? null,
      });
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

  const currentActionError =
    validationError || createError || updateError || deleteError;

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          width: "100%",
          flex: 1,
          boxSizing: "border-box",
        }}
      >
        {/* Top App Header */}
        <Card padding={4}>
          <View direction="row" align="center" justify="space-between">
            <View direction="row" align="center" gap={3}>
              <AppLogo />
              <View>
                <Text as="h1" variant="featured-3" weight="bold">
                  {boardName ?? "Project Board"}
                </Text>
                <Text variant="caption-1" color="neutral-faded">
                  Organize. Prioritize. Deliver.
                </Text>
              </View>
            </View>

            {readOnly ? (
              <Text variant="caption-1" color="neutral-faded">
                Read-only access
              </Text>
            ) : (
              <Button
                color="primary"
                size="medium"
                onClick={() => handleOpenCreate()}
              >
                + Add Task
              </Button>
            )}
          </View>
        </Card>

        {/* Drag-and-drop Persistence Error Banner */}
        {dragError && (
          <Card padding={3}>
            <div role="alert">
              <Text color="critical">{dragError}</Text>
            </div>
          </Card>
        )}

        {!hasLoaded && !fetchError && (
          <LoadingState label="Loading tasks">
            <div style={COLUMNS_GRID_STYLE}>
              {COLUMNS.map((column) => (
                <Skeleton key={column.id} height={100} borderRadius="medium" />
              ))}
            </div>
          </LoadingState>
        )}

        {fetchError && (
          <Card padding={3}>
            <ErrorState
              size={hasLoaded ? "section" : "page"}
              title="Unable to load tasks"
              message={fetchError}
              onRetry={() => {
                void refetch();
              }}
            />
          </Card>
        )}

        {hasLoaded && !fetchError && tasks.length === 0 && (
          <Card padding={3}>
            <EmptyState
              size="page"
              title="No tasks yet"
              description={
                readOnly
                  ? "No task has been created on this project yet."
                  : "Create your first task to get this board started."
              }
              action={
                !readOnly && (
                  <Button color="primary" onClick={() => handleOpenCreate()}>
                    Create a task
                  </Button>
                )
              }
            />
          </Card>
        )}

        {/* Board Columns Grid */}
        {hasLoaded && tasks.length > 0 && (
          <div
            style={{
              ...COLUMNS_GRID_STYLE,
              flex: 1,
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {COLUMNS.map((column) => (
              <Column
                key={column.id}
                columnId={column.id}
                title={column.title}
                tasks={sortByPriority(
                  tasks.filter((task) => task.columnId === column.id),
                )}
                onDropTask={handleDropTask}
                onAddTask={
                  readOnly ? undefined : () => handleOpenCreate(column.id)
                }
                onOpenTask={readOnly ? undefined : handleOpenEdit}
                isTaskPending={isTaskPending}
              />
            ))}
          </div>
        )}

        {/* Modal: Task Creation and Edition */}
        <Modal
          active={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          size="640px"
        >
          <Card padding={6}>
            <View gap={5}>
              <View direction="row" justify="space-between" align="center">
                <Modal.Title>
                  {isEditing ? "Edit Task" : "Create Task"}
                </Modal.Title>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setIsModalOpen(false)}
                  attributes={{ "aria-label": "Close dialog" }}
                >
                  ✕
                </Button>
              </View>

              {currentActionError && (
                <Text color="critical" variant="caption-1">
                  <span role="alert">{currentActionError}</span>
                </Text>
              )}

              <View gap={4}>
                {/* Title */}
                <FormControl>
                  <FormControl.Label>Title</FormControl.Label>
                  <TextField
                    name="title"
                    placeholder="Task title..."
                    value={activeTask.title}
                    onChange={({ value }) => {
                      setActiveTask((prev) => ({ ...prev, title: value }));
                      setValidationError(null);
                    }}
                  />
                </FormControl>

                {/* Assignee */}
                <FormControl>
                  <FormControl.Label>Assignee</FormControl.Label>
                  <Select
                    name="assignee"
                    value={activeTask.assignee?.id ?? ""}
                    onChange={({ value }) =>
                      setActiveTask((prev) => {
                        const user = teamUsers.find((u) => u.userId === value);
                        return {
                          ...prev,
                          assignee: user
                            ? { id: user.userId, name: user.name }
                            : undefined,
                        };
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {teamUsers.map((user) => (
                      <option key={user.userId} value={user.userId}>
                        {user.role === "owner"
                          ? `${user.name} (owner)`
                          : user.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {/* Priority */}
                <View gap={1}>
                  <Text variant="caption-1" color="neutral-faded">
                    Priority
                  </Text>
                  <View
                    direction="row"
                    gap={2}
                    attributes={{ role: "group", "aria-label": "Priority" }}
                  >
                    {PRIORITIES.map((p) => {
                      const isSelected = activeTask.priority === p;
                      return (
                        <View.Item key={p} grow>
                          <Button
                            size="medium"
                            fullWidth
                            variant={isSelected ? "solid" : "outline"}
                            color={isSelected ? "primary" : "neutral"}
                            attributes={{ "aria-pressed": isSelected }}
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
                  <View
                    direction="row"
                    gap={2}
                    attributes={{ role: "group", "aria-label": "Status" }}
                  >
                    {COLUMNS.map((col) => {
                      const isSelected = activeTask.columnId === col.id;
                      return (
                        <View.Item key={col.id} grow>
                          <Button
                            size="medium"
                            fullWidth
                            variant={isSelected ? "solid" : "outline"}
                            color={isSelected ? "primary" : "neutral"}
                            attributes={{ "aria-pressed": isSelected }}
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

                {/* Deadline */}
                <FormControl>
                  <FormControl.Label>Deadline</FormControl.Label>
                  <TextField
                    name="deadline"
                    value={toDateTimeLocalValue(activeTask.deadline)}
                    inputAttributes={{
                      type: "datetime-local",
                    }}
                    onChange={({ value }) =>
                      setActiveTask((prev) => ({
                        ...prev,
                        deadline: toIsoDeadline(value),
                      }))
                    }
                  />
                </FormControl>

                {/* Description */}
                <FormControl>
                  <FormControl.Label>Description</FormControl.Label>
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
                </FormControl>
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
                <Modal.Title>Delete Task</Modal.Title>
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
