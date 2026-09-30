import type { DomainEvent } from "./DomainEvent.js";
import type { EventBus } from "./EventBus.js";
import {
  createEventLogger,
  errorMessage,
  type EventLogger,
} from "./eventLogger.js";

const defaultLogger = createEventLogger("event-bus");

// For side-effect events published after a successful business operation:
// the operation is already persisted, so a broker failure must not turn the
// HTTP response into an error. The lost event is logged as an error with
// its id and type; the payload is left out on purpose (it holds user
// content such as task titles). There is no automatic retry on the
// publishing side (decision for S2-28).
export async function publishSafely(
  eventBus: EventBus,
  event: DomainEvent,
  logger: EventLogger = defaultLogger,
): Promise<boolean> {
  try {
    await eventBus.publish(event);
    return true;
  } catch (error) {
    const cause =
      error instanceof Error && error.cause !== undefined
        ? errorMessage(error.cause)
        : undefined;
    logger.error("Event lost: could not be published", {
      eventId: event.id,
      eventType: event.type,
      error: cause ?? errorMessage(error),
    });
    return false;
  }
}
