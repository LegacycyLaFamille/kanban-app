import type { DomainEvent } from "./DomainEvent.js";
import type { EventBus } from "./EventBus.js";

// For side-effect events published after a successful business operation:
// the operation is already persisted, so a broker failure must not turn the
// HTTP response into an error. The failure is logged with the event id and
// type so it can be traced (see S2-28 for retries).
export async function publishSafely(
  eventBus: EventBus,
  event: DomainEvent,
  log: (message: string) => void = (m) => console.error(m),
): Promise<boolean> {
  try {
    await eventBus.publish(event);
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? `: ${error.cause.message}`
        : "";
    log(
      `[event-bus] Event lost: ${event.type} ${event.id} (${reason}${cause})`,
    );
    return false;
  }
}
