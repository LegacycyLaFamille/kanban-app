import {
  PrismaClient,
  type ProjectMember as PrismaProjectMember,
} from "../../generated/prisma/client.js";
import { ProjectMember } from "./ProjectMember.js";
import type { ProjectMemberRepository } from "./ProjectMemberRepository.js";

export class PrismaProjectMemberRepository implements ProjectMemberRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(prismaMember: PrismaProjectMember): ProjectMember {
    return new ProjectMember(
      prismaMember.id,
      prismaMember.projectId,
      prismaMember.userId,
      prismaMember.createdAt,
    );
  }

  async findByProjectAndUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember | null> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return member ? this.toDomain(member) : null;
  }

  async findByProject(projectId: string): Promise<ProjectMember[]> {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    return members.map((member) => this.toDomain(member));
  }

  async findByUser(userId: string): Promise<ProjectMember[]> {
    const members = await this.prisma.projectMember.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return members.map((member) => this.toDomain(member));
  }

  async add(member: ProjectMember): Promise<void> {
    await this.prisma.projectMember.create({
      data: {
        id: member.id,
        projectId: member.projectId,
        userId: member.userId,
        createdAt: member.createdAt,
      },
    });
  }

  async remove(projectId: string, userId: string): Promise<void> {
    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }
}
