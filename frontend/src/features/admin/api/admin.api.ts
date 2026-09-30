import { httpClient } from "../../../shared/api";

import type { AdminProjectTasks } from "../types/admin.types";

export function getAdminTasks(): Promise<AdminProjectTasks[]> {
  return httpClient.get<AdminProjectTasks[]>("/admin/tasks");
}

export function assignAdminTask(
  taskId: string,
  assigneeId: string | null,
): Promise<{ id: string; assigneeId: string | null }> {
  return httpClient.patch<
    { id: string; assigneeId: string | null },
    { assigneeId: string | null }
  >(`/admin/tasks/${encodeURIComponent(taskId)}/assignee`, { assigneeId });
}
