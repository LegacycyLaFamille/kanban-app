import type {
  PrismaClient,
  ProjectInvitation as PrismaProjectInvitation,
} from "../../generated/prisma/client.js";
import type { ProjectMember } from "../projects/ProjectMember.js";
import { ProjectInvitation } from "./ProjectInvitation.js";
import type {
  ProjectInvitationRepository,
  ProjectInvitationView,
} from "./ProjectInvitationRepository.js";

const viewSelect = {
  id: true,
  createdAt: true,
  role: true,
  project: { select: { id: true, name: true } },
  invitee: { select: { id: true, name: true, email: true } },
  inviter: { select: { id: true, name: true } },
} as const;

export class PrismaProjectInvitationRepository implements ProjectInvitationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(row: PrismaProjectInvitation): ProjectInvitation {
    return new ProjectInvitation(
      row.id,
      row.projectId,
      row.inviteeId,
      row.inviterId,
      row.createdAt,
      row.role,
    );
  }

  async create(invitation: ProjectInvitation): Promise<void> {
    await this.prisma.projectInvitation.create({
      data: {
        id: invitation.id,
        projectId: invitation.projectId,
        inviteeId: invitation.inviteeId,
        inviterId: invitation.inviterId,
        createdAt: invitation.createdAt,
        role: invitation.role,
      },
    });
  }

  async findById(id: string): Promise<ProjectInvitation | null> {
    const row = await this.prisma.projectInvitation.findUnique({
      where: { id },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByProjectAndInvitee(
    projectId: string,
    inviteeId: string,
  ): Promise<ProjectInvitation | null> {
    const row = await this.prisma.projectInvitation.findUnique({
      where: { projectId_inviteeId: { projectId, inviteeId } },
    });
    return row ? this.toDomain(row) : null;
  }

  findViewById(id: string): Promise<ProjectInvitationView | null> {
    return this.prisma.projectInvitation.findUnique({
      where: { id },
      select: viewSelect,
    });
  }

  findViewsByProject(projectId: string): Promise<ProjectInvitationView[]> {
    return this.prisma.projectInvitation.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: viewSelect,
    });
  }

  findViewsByInvitee(inviteeId: string): Promise<ProjectInvitationView[]> {
    return this.prisma.projectInvitation.findMany({
      where: { inviteeId },
      orderBy: { createdAt: "desc" },
      select: viewSelect,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.projectInvitation.delete({ where: { id } });
  }

  async accept(
    invitation: ProjectInvitation,
    member: ProjectMember,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.projectMember.create({
        data: {
          id: member.id,
          projectId: member.projectId,
          userId: member.userId,
          createdAt: member.createdAt,
          role: member.role,
        },
      }),
      this.prisma.projectInvitation.delete({ where: { id: invitation.id } }),
    ]);
  }
}
