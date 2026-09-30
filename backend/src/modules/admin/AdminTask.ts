// Read-model types for the admin dashboard's global task overview. Kept
// separate from the tasks module's own Task domain entity (see Task.ts) the
// same way the exports module keeps its own ExportTask/ExportProject shapes
// (DataExport.ts) rather than reusing the mutation-facing entity for a
// denormalized, reporting-shaped view.

export interface AdminAssignableUser {
  id: string;
  name: string;
  email: string;
}

export interface AdminTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
  boardId: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
}

export interface AdminProjectTasks {
  projectId: string;
  projectName: string;
  // Owner + members of this project: the only users a task in this project
  // may be assigned to (see AdminTaskService.assign()). Included here so the
  // frontend can render the assignment control without a second fetch.
  assignableUsers: AdminAssignableUser[];
  tasks: AdminTask[];
}
