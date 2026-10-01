import { randomUUID } from "node:crypto";
import type { ProjectRepository } from "../projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../projects/ProjectMemberRepository.js";
import {
  TASK_DONE_STATUS,
  type TaskAssignedEvent,
  type TaskCompletedEvent,
  type TaskCreatedEvent,
  type TaskUpdatedEvent,
} from "../tasks/task.events.js";
import { Notification } from "./Notification.js";
import type {
  NotificationRepository,
  NotificationView,
} from "./NotificationRepository.js";

export type NotifiableTaskEvent =
  TaskCreatedEvent | TaskCompletedEvent | TaskUpdatedEvent | TaskAssignedEvent;

export class NotificationNotFoundError extends Error {
  constructor() {
    super("Notification not found");
  }
}

export interface NotificationPage {
  items: NotificationView[];
  // Pass as `cursor` to get the next page, null on the last page.
  nextCursor: string | null;
}

export interface NotificationResult {
  recipients: number;
  created: number;
}

export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
  ) {}

  /**
   * Recipients, always limited to users who still have access to the
   * project and never including the user who triggered the event:
   * - task.created / task.completed: the whole project (owner and members),
   *   except a task's assignee at creation, who gets task.assigned instead;
   * - task.assigned: the new assignee;
   * - task.updated: the task's assignee, unless the update is an
   *   assignment (task.assigned) or a completion (task.completed), so one
   *   action never produces two notifications for the same person.
   * Safe to call several times with the same event: existing notifications
   * are not duplicated.
   */
  async notifyTaskEvent(
    event: NotifiableTaskEvent,
  ): Promise<NotificationResult> {
    const project = await this.projectRepository.findById(
      event.payload.projectId,
    );
    // Deleted since the event was published: nobody left to notify.
    if (project === null) return { recipients: 0, created: 0 };

    const members = await this.projectMemberRepository.findByProject(
      project.id,
    );
    const withAccess = new Set([
      project.ownerId,
      ...members.map((m) => m.userId),
    ]);

    const recipients = [...new Set(this.targetsOf(event, withAccess))].filter(
      (userId) => withAccess.has(userId) && userId !== event.actorId,
    );
    const changes = event.type === "task.updated" ? event.payload.changes : [];

    const createdAt = new Date(event.occurredAt);
    const created = await this.notificationRepository.createMany(
      recipients.map(
        (userId) =>
          new Notification(
            randomUUID(),
            userId,
            event.type,
            event.id,
            event.actorId,
            project.id,
            event.payload.taskId,
            event.payload.title,
            null,
            createdAt,
            changes,
          ),
      ),
    );

    return { recipients: recipients.length, created };
  }

  private targetsOf(
    event: NotifiableTaskEvent,
    projectUsers: Set<string>,
  ): string[] {
    switch (event.type) {
      case "task.assigned":
        return [event.payload.assigneeId];

      case "task.updated": {
        const { assigneeId, changes, status, previousStatus } = event.payload;
        if (!assigneeId) return [];
        if (changes.includes("assigneeId")) return [];
        const completed =
          status === TASK_DONE_STATUS && previousStatus !== TASK_DONE_STATUS;
        return completed ? [] : [assigneeId];
      }

      case "task.created": {
        const assigneeId = event.payload.assigneeId ?? null;
        return [...projectUsers].filter((userId) => userId !== assigneeId);
      }

      case "task.completed":
        return [...projectUsers];
    }
  }

  async list(
    userId: string,
    query: { unreadOnly: boolean; limit: number; cursor?: string },
  ): Promise<NotificationPage> {
    // One extra row tells whether another page exists.
    const rows = await this.notificationRepository.findForUser(userId, {
      ...query,
      limit: query.limit + 1,
    });
    const items = rows.slice(0, query.limit);
    const hasMore = rows.length > query.limit;
    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  countUnread(userId: string): Promise<number> {
    return this.notificationRepository.countUnread(userId);
  }

  async markRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationView> {
    const view = await this.notificationRepository.markRead(
      notificationId,
      userId,
      new Date(),
    );
    if (view === null) throw new NotificationNotFoundError();
    return view;
  }

  markAllRead(userId: string): Promise<number> {
    return this.notificationRepository.markAllRead(userId, new Date());
  }
}
