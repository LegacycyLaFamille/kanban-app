// src/tasks/PrismaTaskRepository.ts
import {
  PrismaClient,
  type Task as PrismaTask,
} from "../../generated/prisma/client.js";
import { Task } from "./Task.js";
import type { TaskRepository } from "./TaskRepository.js";

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(prismaTask: PrismaTask): Task {
    return new Task(
      prismaTask.id,
      prismaTask.title,
      prismaTask.description,
      prismaTask.projectId,
      prismaTask.status,
      prismaTask.priority,
      prismaTask.deadline,
      prismaTask.createdAt,
      prismaTask.boardId,
    );
  }

  async findById(id: string): Promise<Task | null> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    return task ? this.toDomain(task) : null;
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    return tasks.map((task) => this.toDomain(task));
  }

  async save(task: Task): Promise<Task | void> {
    await this.prisma.task.upsert({
      where: { id: task.id },
      update: {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
        projectId: task.projectId,
        boardId: task.boardId,
      },
      create: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
        projectId: task.projectId,
        createdAt: task.createdAt,
        boardId: task.boardId,
      },
    });
  }
  async delete(task: Task): Promise<void> {
    await this.prisma.task.delete({ where: { id: task.id } });
  }
}
