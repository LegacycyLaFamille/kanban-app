import type { EventBus } from "../../shared/events/EventBus.js";
import { logger } from "../../shared/observability/logger.js";
import type {
  NotificationService,
  NotifiableTaskEvent,
} from "./NotificationService.js";

export const NOTIFICATION_CONSUMER = "notifications.task-events";

// task.updated only notifies the task's assignee (see
// NotificationService.notifyTaskEvent), not the whole project.
export const NOTIFIED_EVENT_TYPES = [
  "task.created",
  "task.completed",
  "task.updated",
  "task.assigned",
] as const satisfies NotifiableTaskEvent["type"][];

export function subscribeNotificationConsumer(
  eventBus: EventBus,
  service: NotificationService,
  log: (message: string) => void = (m) => logger.info(m),
): Promise<void> {
  return eventBus.subscribe<NotifiableTaskEvent>({
    name: NOTIFICATION_CONSUMER,
    eventTypes: [...NOTIFIED_EVENT_TYPES],
    handler: async (event) => {
      const { recipients, created } = await service.notifyTaskEvent(event);
      log(
        `[notifications] ${event.type} ${event.id}: ` +
          `${created} created for ${recipients} recipient(s)` +
          (created < recipients
            ? ` (${recipients - created} already existed)`
            : ""),
      );
    },
  });
}
