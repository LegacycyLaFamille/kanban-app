import { Task } from "./Task.js";

export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  findByProjectId(projectId: string): Promise<Task[]>;
  save(task: Task): Promise<void>;
}
