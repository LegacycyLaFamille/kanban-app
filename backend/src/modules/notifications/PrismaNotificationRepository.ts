import type { PrismaClient } from "../../generated/prisma/client.js";
import type { Notification } from "./Notification.js";
import {
  InvalidNotificationCursorError,
  type NotificationListQuery,
  type NotificationRepository,
  type NotificationView,
} from "./NotificationRepository.js";

const viewInclude = { project: { select: { id: true, name: true } } } as const;

type NotificationRow = {
  id: string;
  type: string;
  actorId: string | null;
  taskId: string | null;
  taskTitle: string | null;
  changes: string[];
  readAt: Date | null;
  createdAt: Date;
  project: { id: string; name: string };
};

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(notifications: Notification[]): Promise<number> {
    if (notifications.length === 0) return 0;

    // skipDuplicates relies on the (eventId, userId) unique index: a
    // redelivered event inserts nothing instead of failing.
    const { count } = await this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        eventId: n.eventId,
        actorId: n.actorId,
        projectId: n.projectId,
        taskId: n.taskId,
        taskTitle: n.taskTitle,
        changes: n.changes,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      skipDuplicates: true,
    });
    return count;
  }

  async findForUser(
    userId: string,
    { unreadOnly, limit, cursor }: NotificationListQuery,
  ): Promise<NotificationView[]> {
    // The cursor must be one of the user's own notifications, so a page can
    // never be positioned from someone else's data.
    let after: { createdAt: Date; id: string } | null = null;
    if (cursor !== undefined) {
      after = await this.prisma.notification.findFirst({
        where: { id: cursor, userId },
        select: { createdAt: true, id: true },
      });
      if (after === null) throw new InvalidNotificationCursorError();
    }

    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
        ...(after
          ? {
              OR: [
                { createdAt: { lt: after.createdAt } },
                { createdAt: after.createdAt, id: { lt: after.id } },
              ],
            }
          : {}),
      },
      include: viewInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });
    return this.toViews(rows);
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(
    notificationId: string,
    userId: string,
    readAt: Date,
  ): Promise<NotificationView | null> {
    // Scoped by userId: another user's notification behaves as missing.
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt },
    });
    const row = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
      include: viewInclude,
    });
    if (row === null) return null;
    const [view] = await this.toViews([row]);
    return view ?? null;
  }

  async markAllRead(userId: string, readAt: Date): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt },
    });
    return count;
  }

  // actorId has no foreign key (the notification outlives the actor), so
  // names are resolved in one extra query instead of a relation.
  private async toViews(rows: NotificationRow[]): Promise<NotificationView[]> {
    const actorIds = [
      ...new Set(rows.flatMap((r) => (r.actorId ? [r.actorId] : []))),
    ];
    const actors =
      actorIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true },
          });
    const actorsById = new Map(actors.map((a) => [a.id, a]));

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      readAt: r.readAt,
      createdAt: r.createdAt,
      project: r.project,
      task: r.taskId ? { id: r.taskId, title: r.taskTitle } : null,
      actor: (r.actorId && actorsById.get(r.actorId)) || null,
      changes: r.changes,
    }));
  }
}
