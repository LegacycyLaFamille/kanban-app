import { PrismaClient } from "../../generated/prisma/client.js";
import type { ExportProject } from "./DataExport.js";
import type { DataExportRepository } from "./DataExportRepository.js";

export class PrismaDataExportRepository implements DataExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOwnedProjects(userId: string): Promise<ExportProject[]> {
    const projects = await this.prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
      include: {
        Task: {
          orderBy: { createdAt: "asc" },
          include: { board: { select: { name: true } } },
        },
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
      tasks: project.Task.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
        boardName: task.board?.name ?? null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
    }));
  }
}
