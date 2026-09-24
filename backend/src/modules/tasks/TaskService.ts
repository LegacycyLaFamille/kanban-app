import type { TaskRepository } from "./TaskRepository.js";
import { Task } from "./Task.js";
import type { ProjectRepository } from "../projects/ProjectRepository.js";
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
    private readonly projectRepository: ProjectRepository,
  ) {}

  async read(projectId: string, userid: string): Promise<Task[]> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== userid) {
      throw new Error("Forbidden");
    }
    const tasks = await this.taskRepository.findByProjectId(projectId);

    if (!tasks) {
      return [];
    }
    return tasks;
  }

  async readSingle(taskId: string, userid: string): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Not found");
    }
    if (!(await this.checkPermission(userid, task))) {
      throw new Error("Forbidden");
    }
    return task;
  }

  async create(
    projectId: string,
    userid: string,
    data: CreateTaskDto,
  ): Promise<Task> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== userid) throw new Error("Forbidden");

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

  async update(
    taskId: string,
    userid: string,
    data: updateTaskDto,
  ): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new Error("Not found");
    if (!(await this.checkPermission(userid, task)))
      throw new Error("Forbidden");

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

  async delete(taskId: string, userid: string): Promise<void> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Not found");
    }
    if (!(await this.checkPermission(userid, task))) {
      throw new Error("Forbidden");
    }
    await this.taskRepository.delete(task);
  }

  private async checkPermission(userid: string, task: Task): Promise<boolean> {
    const project = await this.projectRepository.findById(task.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    return project.ownerId === userid;
  }
}
