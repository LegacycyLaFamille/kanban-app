export type ProjectStatus = "ACTIVE" | "ARCHIVED";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ProjectMember = {
  id: string;
  name: string;
  initials: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  taskCount: number;
  progress: number;
  members: ProjectMember[];
  updatedAt: string;
};

export type ProjectTaskSummary = {
  todo: number;
  inProgress: number;
  done: number;
};

export type ProjectTaskPreview = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
};

export type ProjectDetails = Project & {
  owner: ProjectMember;
  createdAt: string;
  deadline?: string;
  taskSummary: ProjectTaskSummary;
  recentTasks: ProjectTaskPreview[];
};

export type CreateProjectPayload = {
  name: string;
  description?: string;
};
