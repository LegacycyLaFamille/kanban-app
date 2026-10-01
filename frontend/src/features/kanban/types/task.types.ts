export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "Low" | "Medium" | "High";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority | null;
  status: TaskStatus | string;
  deadline?: string | null;
  projectId: string;
  boardId?: string | null;
  assigneeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string | null;
  priority?: TaskPriority | null;
  status?: TaskStatus | string;
  deadline?: string | null;
  boardId?: string | null;
  // Owner or member of the project; null leaves the task unassigned.
  assigneeId?: string | null;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  priority?: TaskPriority | null;
  status?: TaskStatus | string;
  deadline?: string | null;
  boardId?: string | null;
  // null clears the assignment.
  assigneeId?: string | null;
}
