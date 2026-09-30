export type AdminAssignableUser = {
  id: string;
  name: string;
  email: string;
};

export type AdminTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  boardId: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
};

export type AdminProjectTasks = {
  projectId: string;
  projectName: string;
  assignableUsers: AdminAssignableUser[];
  tasks: AdminTask[];
};
