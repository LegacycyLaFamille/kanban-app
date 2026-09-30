export type MyTask = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  status: string;
  priority: string;
  deadline: string | null;
  createdAt: string;
  boardId: string | null;
  assigneeId: string | null;
  project: { id: string; name: string };
};

export type MyTaskProjectGroup = {
  projectId: string;
  projectName: string;
  tasks: MyTask[];
};
