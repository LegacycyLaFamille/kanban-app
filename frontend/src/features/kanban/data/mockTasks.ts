import type { Task } from "../types";

export const initialTasks: Task[] = [
  { id: "1", title: "Design the login page", columnId: "todo" },
  { id: "2", title: "Set up the database schema", columnId: "todo" },
  { id: "3", title: "Implement authentication", columnId: "in-progress" },
  { id: "4", title: "Write API documentation", columnId: "done" },
];
