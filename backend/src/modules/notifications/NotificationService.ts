import { randomUUID } from "node:crypto";
import type { ProjectRepository } from "../projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../projects/ProjectMemberRepository.js";
import type {
  TaskCompletedEvent,
  TaskCreatedEvent,
} from "../tasks/task.events.js";
import { Notification } from "./Notification.js";
import type { NotificationRepository } from "./NotificationRepository.js";

export type NotifiableTaskEvent = TaskCreatedEvent | TaskCompletedEvent;

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

  // Everyone with access to the project (owner and members) is notified,
  // except the user who triggered the event. Safe to call several times
  // with the same event: existing notifications are not duplicated.
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
    const recipients = [
      ...new Set([project.ownerId, ...members.map((m) => m.userId)]),
    ].filter((userId) => userId !== event.actorId);

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
          ),
      ),
    );

    return { recipients: recipients.length, created };
  }
}
