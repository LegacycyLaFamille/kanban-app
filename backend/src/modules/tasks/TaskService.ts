import type { TaskRepository } from "./TaskRepository.js";
import { Task } from "./Task.js";
import type { ProjectAccessGuard } from "../../shared/security/ProjectAccessGuard.js";
import { randomUUID } from "node:crypto";

export interface CreateTaskDto {
  title: string;
  description: string;
  priority: string;
  status: string;
  deadline?: string | null;
  boardId?: string | null;
}

export interface updateTaskDto {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  deadline?: string | null;
  boardId?: string | null;
}

export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly projectAccessGuard: ProjectAccessGuard,
  ) {}

  /** Owner or member of the parent project. */
  async read(projectId: string, userid: string): Promise<Task[]> {
    await this.projectAccessGuard.assertCanView(projectId, userid);

    const tasks = await this.taskRepository.findByProjectId(projectId);

    if (!tasks) {
      return [];
    }
    return tasks;
  }

  /** Owner or member of the parent project. */
  async readSingle(taskId: string, userid: string): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Not found");
    }
    await this.projectAccessGuard.assertCanView(task.projectId, userid);
    return task;
  }

  /** Owner of the parent project only. */
  async create(
    projectId: string,
    userid: string,
    data: CreateTaskDto,
  ): Promise<Task> {
    await this.projectAccessGuard.assertIsOwner(projectId, userid);

    const newTask = new Task(
      randomUUID(),
      data.title ?? data.title,
      data.description ?? data.description,
      projectId,
      data.status ?? data.status,
      data.priority ?? data.priority,
      data.deadline ? new Date(data.deadline) : null,
      new Date(),
      data.boardId ? data.boardId : null,
    );
    const res = await this.taskRepository.save(newTask);
    if (!res) {
      throw new Error("Task not created");
    }
    return res;
  }

  /** Owner of the parent project only. */
  async update(
    taskId: string,
    userid: string,
    data: updateTaskDto,
  ): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new Error("Not found");
    await this.projectAccessGuard.assertIsOwner(task.projectId, userid);

    const updatedTask = new Task(
      task.id,
      data.title ?? task.title,
      data.description ?? task.description,
      task.projectId,
      data.status ?? task.status,
      data.priority ?? task.priority,
      data.deadline ? new Date(data.deadline) : task.deadline,
      task.createdAt,
      data.boardId !== undefined ? data.boardId : task.boardId,
    );

    await this.taskRepository.save(updatedTask);
    return updatedTask;
  }

  /** Owner of the parent project only. */
  async delete(taskId: string, userid: string): Promise<void> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Not found");
    }
    await this.projectAccessGuard.assertIsOwner(task.projectId, userid);
    await this.taskRepository.delete(task);
  }
}
