import { Task } from "./Task.js";

// A task assigned to a user, with the project it belongs to (for the
// cross-project "My tasks" page).
export interface AssignedTask {
  task: Task;
  project: { id: string; name: string };
}

export interface AssignedTaskFilter {
  status?: string;
}

export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  findByProjectId(projectId: string): Promise<Task[]>;
  // Tasks whose assignee is the user, restricted to projects the user can
  // still view (owner or member): being removed from a project does not
  // clear assigneeId, so the query must check access itself.
  findAssignedTo(
    userId: string,
    filter?: AssignedTaskFilter,
  ): Promise<AssignedTask[]>;
  save(task: Task): Promise<Task>;
  delete(task: Task): Promise<void>;
}
