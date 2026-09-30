import type { Notification } from "../../../modules/notifications/Notification.js";
import {
  InvalidNotificationCursorError,
  type NotificationListQuery,
  type NotificationRepository,
  type NotificationView,
} from "../../../modules/notifications/NotificationRepository.js";

type Row = Omit<Notification, "readAt"> & { readAt: Date | null };

// Test double with the same rules as PrismaNotificationRepository:
// (eventId, userId) unique, newest first, cursor scoped to the user.
export class InMemoryNotificationRepository implements NotificationRepository {
  readonly rows: Row[] = [];

  constructor(
    private readonly projectNames: Record<string, string> = {},
    private readonly userNames: Record<string, string> = {},
  ) {}

  async createMany(notifications: Notification[]): Promise<number> {
    let count = 0;
    for (const n of notifications) {
      const exists = this.rows.some(
        (r) => r.eventId === n.eventId && r.userId === n.userId,
      );
      if (!exists) {
        this.rows.push({ ...n });
        count++;
      }
    }
    return count;
  }

  async findForUser(
    userId: string,
    { unreadOnly, limit, cursor }: NotificationListQuery,
  ): Promise<NotificationView[]> {
    const sorted = this.rows
      .filter((r) => r.userId === userId && (!unreadOnly || r.readAt === null))
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          b.id.localeCompare(a.id),
      );

    let start = 0;
    if (cursor !== undefined) {
      const index = sorted.findIndex((r) => r.id === cursor);
      const ownsCursor = this.rows.some(
        (r) => r.id === cursor && r.userId === userId,
      );
      if (!ownsCursor) throw new InvalidNotificationCursorError();
      start = index + 1;
    }
    return sorted.slice(start, start + limit).map((r) => this.toView(r));
  }

  async countUnread(userId: string): Promise<number> {
    return this.rows.filter((r) => r.userId === userId && r.readAt === null)
      .length;
  }

  async markRead(
    notificationId: string,
    userId: string,
    readAt: Date,
  ): Promise<NotificationView | null> {
    const row = this.rows.find(
      (r) => r.id === notificationId && r.userId === userId,
    );
    if (!row) return null;
    row.readAt ??= readAt;
    return this.toView(row);
  }

  async markAllRead(userId: string, readAt: Date): Promise<number> {
    const unread = this.rows.filter(
      (r) => r.userId === userId && r.readAt === null,
    );
    for (const row of unread) row.readAt = readAt;
    return unread.length;
  }

  private toView(r: Row): NotificationView {
    const actorName = r.actorId ? this.userNames[r.actorId] : undefined;
    return {
      id: r.id,
      type: r.type,
      readAt: r.readAt,
      createdAt: r.createdAt,
      project: {
        id: r.projectId,
        name: this.projectNames[r.projectId] ?? r.projectId,
      },
      task: r.taskId ? { id: r.taskId, title: r.taskTitle } : null,
      actor: r.actorId && actorName ? { id: r.actorId, name: actorName } : null,
    };
  }
}
