import {
  PrismaClient,
  type Task as PrismaTask,
} from "../../generated/prisma/client.js";
import type { ExportProject, ExportTask } from "./DataExport.js";
import type { DataExportRepository } from "./DataExportRepository.js";

const byCreationDate = { createdAt: "asc" } as const;

function toExportTask(task: PrismaTask): ExportTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    deadline: task.deadline,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export class PrismaDataExportRepository implements DataExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOwnedProjects(userId: string): Promise<ExportProject[]> {
    const projects = await this.prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: byCreationDate,
      include: {
        Board: {
          orderBy: byCreationDate,
          include: { tasks: { orderBy: byCreationDate } },
        },
        Task: { where: { boardId: null }, orderBy: byCreationDate },
      },
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      memberIds: [],
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      boards: project.Board.map((board) => ({
        id: board.id,
        name: board.name,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
        tasks: board.tasks.map(toExportTask),
      })),
      unassignedTasks: project.Task.map(toExportTask),
    }));
  }
}
