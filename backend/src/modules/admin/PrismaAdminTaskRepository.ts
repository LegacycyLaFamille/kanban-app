import { PrismaClient } from "../../generated/prisma/client.js";
import type { AdminProjectTasks } from "./AdminTask.js";
import type { AdminTaskRepository } from "./AdminTaskRepository.js";

export class PrismaAdminTaskRepository implements AdminTaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAllGroupedByProject(): Promise<AdminProjectTasks[]> {
    // Single query with nested includes: O(1) round trips regardless of how
    // many projects/tasks exist, matching the pattern already used by
    // DataExportRepository.findOwnedProjects().
    const projects = await this.prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        Member: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        Task: {
          orderBy: { createdAt: "desc" },
          include: { assignee: { select: { name: true, email: true } } },
        },
      },
    });

    return projects
      .filter((project) => project.Task.length > 0)
      .map((project) => ({
        projectId: project.id,
        projectName: project.name,
        assignableUsers: [
          {
            id: project.owner.id,
            name: project.owner.name,
            email: project.owner.email,
          },
          ...project.Member.map((member) => ({
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
          })),
        ],
        tasks: project.Task.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          boardId: task.boardId,
          assigneeId: task.assigneeId,
          assigneeName: task.assignee?.name ?? null,
          assigneeEmail: task.assignee?.email ?? null,
        })),
      }));
  }
}
