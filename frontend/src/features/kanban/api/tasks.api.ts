import { httpClient } from "../../../shared/api";

import type { CreateTaskDto, Task, UpdateTaskDto } from "../types/task.types";

export function getTasksByProject(projectId: string): Promise<Task[]> {
  return httpClient.get<Task[]>(`/projects/${projectId}/tasks`);
}

export function createTask(
  projectId: string,
  payload: CreateTaskDto,
): Promise<Task> {
  return httpClient.post<Task, CreateTaskDto>(
    `/projects/${projectId}/tasks`,
    payload,
  );
}

export function updateTask(
  taskId: string,
  payload: UpdateTaskDto,
): Promise<Task> {
  return httpClient.patch<Task, UpdateTaskDto>(`/tasks/${taskId}`, payload);
}

export function deleteTask(taskId: string): Promise<void> {
  return httpClient.delete<void>(`/tasks/${taskId}`);
}
