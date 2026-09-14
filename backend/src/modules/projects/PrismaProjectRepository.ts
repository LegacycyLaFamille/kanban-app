import {
  PrismaClient,
  type Project as PrismaProject,
} from "../../generated/prisma/client.js";
import { Project } from "./Project.js";
import type { ProjectRepository } from "./ProjectRepository.js";

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(prismaProject: PrismaProject): Project {
    return new Project(
      prismaProject.id,
      prismaProject.name,
      prismaProject.description,
      prismaProject.ownerId,
      prismaProject.createdAt,
    );
  }

  async findById(id: string): Promise<Project | null> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    return project ? this.toDomain(project) : null;
  }

  async findByUser(ownerId: string): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    return projects.map((project) => this.toDomain(project));
  }

  async save(project: Project): Promise<void> {
    await this.prisma.project.upsert({
      where: { id: project.id },
      update: {
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
      },
      create: {
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        createdAt: project.createdAt,
      },
    });
  }
}
