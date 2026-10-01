import type { PrismaClient } from "../../generated/prisma/client.js";
import type {
  AdminStats,
  AdminStatsRepository,
} from "./AdminStatsRepository.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export class PrismaAdminStatsRepository implements AdminStatsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async stats(now: Date): Promise<AdminStats> {
    const lastWeek = new Date(now.getTime() - 7 * DAY_MS);
    const lastDay = new Date(now.getTime() - DAY_MS);

    const [
      users,
      newUsersLast7Days,
      projects,
      tasksByStatus,
      overdue,
      createdLast24Hours,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: lastWeek } } }),
      this.prisma.project.count(),
      this.prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.task.count({
        where: { deadline: { lt: now }, status: { not: "DONE" } },
      }),
      this.prisma.task.count({ where: { createdAt: { gte: lastDay } } }),
      this.prisma.notification.count({ where: { readAt: null } }),
    ]);

    const countFor = (status: string) =>
      tasksByStatus.find((group) => group.status === status)?._count._all ?? 0;

    return {
      users,
      newUsersLast7Days,
      projects,
      tasks: {
        total: tasksByStatus.reduce((sum, group) => sum + group._count._all, 0),
        todo: countFor("TODO"),
        inProgress: countFor("IN_PROGRESS"),
        done: countFor("DONE"),
        overdue,
        createdLast24Hours,
      },
      unreadNotifications,
    };
  }
}
