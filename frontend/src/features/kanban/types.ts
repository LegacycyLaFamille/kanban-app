// src/features/kanban/types.ts
export type ColumnId = "todo" | "in-progress" | "done";

export type TaskPriority = "low" | "medium" | "high";

export type TaskAssignee = {
  id: string;
  name: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  columnId: ColumnId;
  priority?: TaskPriority;
  deadline?: string;
  assignee?: TaskAssignee;
  createdAt?: string;
  updatedAt?: string;
};

export const DND_ITEM_TYPE = "TASK_CARD";

export type DragItem = {
  id: string;
  sourceColumnId: ColumnId;
};