import type { Task } from "../types";

export const initialTasks: Task[] = [
  {
    id: "1",
    title: "Design the login page",
    description: "Create wireframes and high-fidelity mockups for the login flow.",
    projectId: "1",
    columnId: "todo",
    priority: "high",
    deadline: "2026-09-20",
    assignee: { id: "u1", name: "Alice Martin" },
  },
  {
    id: "2",
    title: "Set up the database schema",
    projectId: "1",
    columnId: "todo",
    priority: "medium",
  },
  {
    id: "3",
    title: "Implement authentication",
    description: "JWT-based auth with refresh tokens.",
    projectId: "1",
    columnId: "in-progress",
    priority: "high",
    deadline: "2026-09-18",
    assignee: { id: "u2", name: "Karim Belhadj" },
  },
  {
    id: "4",
    title: "Write API documentation",
    projectId: "1",
    columnId: "done",
  },
];