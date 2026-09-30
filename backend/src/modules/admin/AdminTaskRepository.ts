import type { AdminProjectTasks } from "./AdminTask.js";

export interface AdminTaskRepository {
  /** All tasks across all projects, grouped by project, for the admin dashboard. */
  findAllGroupedByProject(): Promise<AdminProjectTasks[]>;
}
