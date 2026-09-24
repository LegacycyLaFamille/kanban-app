import { useState } from "react";
import { Button, Card, Modal, Text, TextArea, TextField, View } from "reshaped";

type TaskItem = {
  id: string;
  title: string;
  tag: string;
  description: string;
  assignee: string;
  status: "todo" | "in-progress" | "done";
};

type Column = {
  id: "todo" | "in-progress" | "done";
  title: string;
};

const COLUMNS: Column[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

const INITIAL_TASKS: TaskItem[] = [
  {
    id: "1",
    title: "Set up Docker backend proxy",
    tag: "DevOps",
    description:
      "Configure proxy to bridge front and back services without CORS issues.",
    assignee: "Alex",
    status: "todo",
  },
  {
    id: "2",
    title: "Implement user authentication",
    tag: "Backend",
    description: "JWT access token + refresh token flow.",
    assignee: "Sarah",
    status: "todo",
  },
  {
    id: "3",
    title: "Design system token review",
    tag: "Design",
    description: "Align color tokens and spacing with the design team specs.",
    assignee: "Léo",
    status: "todo",
  },
  {
    id: "4",
    title: "Kanban board layout skeleton",
    tag: "Frontend",
    description: "Render columns, cards, and modal triggers.",
    assignee: "Léo",
    status: "in-progress",
  },
  {
    id: "5",
    title: "Database schema migration",
    tag: "Database",
    description: "Create items, users, and board relationship tables.",
    assignee: "Sarah",
    status: "in-progress",
  },
  {
    id: "6",
    title: "Configure Reshaped UI & Vite setup",
    tag: "Frontend",
    description: "Install dependencies and verify local runtime.",
    assignee: "Alex",
    status: "done",
  },
];

const EMPTY_TASK: TaskItem = {
  id: "",
  title: "",
  tag: "Frontend",
  description: "",
  assignee: "",
  status: "todo",
};

export function KanbanBoard() {
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskItem>(EMPTY_TASK);
  const [isEditing, setIsEditing] = useState(false);

  const handleOpenCreate = (status: TaskItem["status"] = "todo") => {
    setActiveTask({
      ...EMPTY_TASK,
      id: Date.now().toString(),
      status,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: TaskItem) => {
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        height: "100%",
        width: "100%",
        flex: 1,
      }}
    >
      {/* Header */}
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

      {/* Columns Grid */}
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
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);

          return (
            <Card key={column.id} padding={4}>
              <View gap={4}>
                <View direction="row" align="center" justify="space-between">
                  <View direction="row" align="center" gap={2}>
                    <Text weight="bold">{column.title}</Text>
                    <Text variant="caption-1" color="neutral-faded">
                      ({columnTasks.length})
                    </Text>
                  </View>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => handleOpenCreate(column.id)}
                  >
                    +
                  </Button>
                </View>

                <View gap={3}>
                  {columnTasks.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenEdit(item)}
                      style={{ cursor: "pointer" }}
                    >
                      <Card padding={3}>
                        <View gap={2}>
                          <Text variant="body-2" weight="medium">
                            {item.title}
                          </Text>
                          {item.description && (
                            <Text variant="caption-1" color="neutral-faded">
                              {item.description.length > 55
                                ? `${item.description.slice(0, 55)}...`
                                : item.description}
                            </Text>
                          )}
                          <View
                            direction="row"
                            justify="space-between"
                            align="center"
                          >
                            <Text variant="caption-2" color="neutral-faded">
                              🏷️ {item.tag}
                            </Text>
                            {item.assignee && (
                              <Text variant="caption-2" color="neutral-faded">
                                👤 {item.assignee}
                              </Text>
                            )}
                          </View>
                        </View>
                      </Card>
                    </div>
                  ))}
                </View>

                <Button
                  variant="outline"
                  color="neutral"
                  size="small"
                  fullWidth
                  onClick={() => handleOpenCreate(column.id)}
                >
                  Add card
                </Button>
              </View>
            </Card>
          );
        })}
      </div>

      {/* Task Modal (Create & Edit) */}
      <Modal active={isModalOpen} onClose={() => setIsModalOpen(false)}>
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

            <View gap={3}>
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

              <View direction="row" gap={3}>
                <View.Item grow>
                  <View gap={1}>
                    <Text variant="caption-1" color="neutral-faded">
                      Tag
                    </Text>
                    <TextField
                      name="tag"
                      placeholder="e.g. Frontend, API"
                      value={activeTask.tag}
                      onChange={({ value }) =>
                        setActiveTask((prev) => ({ ...prev, tag: value }))
                      }
                    />
                  </View>
                </View.Item>

                <View.Item grow>
                  <View gap={1}>
                    <Text variant="caption-1" color="neutral-faded">
                      Assignee
                    </Text>
                    <TextField
                      name="assignee"
                      placeholder="e.g. Sarah"
                      value={activeTask.assignee}
                      onChange={({ value }) =>
                        setActiveTask((prev) => ({ ...prev, assignee: value }))
                      }
                    />
                  </View>
                </View.Item>
              </View>

              <View gap={1}>
                <Text variant="caption-1" color="neutral-faded">
                  Status
                </Text>
                <View direction="row" gap={2}>
                  {COLUMNS.map((col) => {
                    const isSelected = activeTask.status === col.id;
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
                              status: col.id,
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
            </View>

            <View gap={1}>
              <Text variant="caption-1" color="neutral-faded">
                Description
              </Text>
              <TextArea
                name="description"
                placeholder="Add details about this task..."
                value={activeTask.description}
                onChange={({ value }) =>
                  setActiveTask((prev) => ({ ...prev, description: value }))
                }
              />
            </View>
          </View>

          {/* Bottom Actions */}
          <View direction="row" justify="end" gap={3}>
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
        </Card>
      </Modal>
    </div>
  );
}
