// src/tasks/PrismaTaskRepository.ts
import {
  PrismaClient,
  type Task as PrismaTask,
} from "../../generated/prisma/client.js";
import { Task } from "./Task.js";
import type {
  AssignedTask,
  AssignedTaskFilter,
  TaskRepository,
} from "./TaskRepository.js";

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
      prismaTask.assigneeId,
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

  async findAssignedTo(
    userId: string,
    filter: AssignedTaskFilter = {},
  ): Promise<AssignedTask[]> {
    const rows = await this.prisma.task.findMany({
      where: {
        assigneeId: userId,
        ...(filter.status === undefined ? {} : { status: filter.status }),
        // Same rule as ProjectAccessGuard.assertCanView: owner or member.
        project: {
          OR: [{ ownerId: userId }, { Member: { some: { userId } } }],
        },
      },
      include: { project: { select: { id: true, name: true } } },
      // Closest deadline first, tasks without deadline last.
      orderBy: [
        { deadline: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" },
      ],
    });
    return rows.map(({ project, ...task }) => ({
      task: this.toDomain(task),
      project,
    }));
  }

  async save(task: Task): Promise<Task> {
    const saved = await this.prisma.task.upsert({
      where: { id: task.id },
      update: {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
        projectId: task.projectId,
        boardId: task.boardId,
        assigneeId: task.assigneeId,
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
        assigneeId: task.assigneeId,
      },
    });
    return this.toDomain(saved);
  }

  async delete(task: Task): Promise<void> {
    await this.prisma.task.delete({ where: { id: task.id } });
  }
}
