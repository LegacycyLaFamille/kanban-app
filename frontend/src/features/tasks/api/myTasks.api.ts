import { httpClient } from "../../../shared/api";
import type { MyTask } from "../types/myTasks.types";

export function getMyTasks(): Promise<MyTask[]> {
  return httpClient.get<MyTask[]>("/tasks/my");
}
