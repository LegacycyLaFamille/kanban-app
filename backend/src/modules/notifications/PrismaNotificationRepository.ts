import type { PrismaClient } from "../../generated/prisma/client.js";
import type { Notification } from "./Notification.js";
import type { NotificationRepository } from "./NotificationRepository.js";

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
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      skipDuplicates: true,
    });
    return count;
  }
}
