import {
  PrismaClient,
  type Task as PrismaTask,
} from "../../generated/prisma/client.js";
import type {
  ExportProject,
  ExportTask,
  PersonalData,
  PersonalDataInvitation,
} from "./DataExport.js";
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

function toInvitation(invitation: {
  projectId: string;
  project: { name: string };
  role: string;
  createdAt: Date;
}): PersonalDataInvitation {
  return {
    projectId: invitation.projectId,
    projectName: invitation.project.name,
    role: invitation.role,
    createdAt: invitation.createdAt,
  };
}

const withProjectName = {
  orderBy: byCreationDate,
  include: { project: { select: { name: true } } },
} as const;

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

  async findPersonalData(userId: string): Promise<PersonalData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        Project: { orderBy: byCreationDate },
        ProjectMember: withProjectName,
        AssignedTask: { orderBy: byCreationDate },
        ReceivedInvitation: withProjectName,
        SentInvitation: withProjectName,
        Notification: { orderBy: byCreationDate },
      },
    });

    if (!user) return null;

    return {
      account: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ownedProjects: user.Project.map((project) => ({
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
      })),
      memberships: user.ProjectMember.map((membership) => ({
        projectId: membership.projectId,
        projectName: membership.project.name,
        role: membership.role,
        joinedAt: membership.createdAt,
      })),
      assignedTasks: user.AssignedTask.map((task) => ({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
      })),
      receivedInvitations: user.ReceivedInvitation.map(toInvitation),
      sentInvitations: user.SentInvitation.map(toInvitation),
      notifications: user.Notification.map((notification) => ({
        id: notification.id,
        type: notification.type,
        projectId: notification.projectId,
        taskTitle: notification.taskTitle,
        changes: notification.changes,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })),
    };
  }
}
