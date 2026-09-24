import { useState, useCallback, type MouseEvent } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Button, Card, Modal, Text, TextArea, TextField, View } from "reshaped";

import type { ColumnId, Task, TaskPriority } from "../types";
import { initialTasks } from "../data/mockTasks";
import { Column } from "./Column";

const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

const EMPTY_TASK: Task = {
  id: "",
  title: "",
  description: "",
  projectId: "default",
  columnId: "todo",
  priority: "medium",
  assignee: { id: "", name: "" },
};

export function Board() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task>(EMPTY_TASK);
  const [isEditing, setIsEditing] = useState(false);

  const handleDropTask = useCallback(
    (taskId: string, targetColumnId: ColumnId) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, columnId: targetColumnId } : task,
        ),
      );
    },
    [],
  );

  const handleOpenCreate = (columnId: ColumnId = "todo") => {
    setActiveTask({
      ...EMPTY_TASK,
      id: Date.now().toString(),
      columnId,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setActiveTask({ ...task });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!activeTask.title.trim()) return;

    if (isEditing) {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeTask.id ? activeTask : t)),
      );
    } else {
      setTasks((prev) => [...prev, activeTask]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    setTasks((prev) => prev.filter((t) => t.id !== activeTask.id));
    setIsDeleteModalOpen(false);
    setIsModalOpen(false);
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

        {/* Board Columns Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            alignItems: "start",
            width: "100%",
            flex: 1,
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
                  <Button color="primary" onClick={handleSave}>
                    {isEditing ? "Save Changes" : "Create Task"}
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
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button color="critical" onClick={handleDelete}>
                  Confirm Delete
                </Button>
              </View>
            </View>
          </Card>
        </Modal>
      </div>
    </DndProvider>
  );
}
