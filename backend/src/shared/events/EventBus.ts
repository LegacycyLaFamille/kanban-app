import type { DomainEvent } from "./DomainEvent.js";

export type EventHandler<E extends DomainEvent = DomainEvent> = (
  event: E,
) => Promise<void>;

// Topic patterns accepted in bindings: `task.*`, `*.created`, `task.#`, `#`.
export type EventTypePattern =
  `${string}.*` | `*.${string}` | `${string}.#` | "#";

export interface EventSubscription<E extends DomainEvent = DomainEvent> {
  // Unique consumer name, `<module>.<purpose>` (e.g. `notifications.task-events`).
  // With RabbitMQ it is the name of the consumer's durable queue.
  name: string;
  // Event types to receive. Topic wildcards are allowed: `*` matches one
  // word, `#` zero or more (e.g. `task.*`).
  eventTypes: Array<E["type"] | EventTypePattern>;
  // Resolving acknowledges the event; throwing sends it to the dead-letter
  // queue. Delivery is at-least-once: handlers must be idempotent.
  handler: EventHandler<E>;
}

// Contract the business modules depend on. They never import amqplib.
export interface EventBus {
  // Rejects with EventPublishError when the event could not be handed to
  // the broker. Use publishSafely when the caller must not fail.
  publish(event: DomainEvent): Promise<void>;
  subscribe<E extends DomainEvent>(
    subscription: EventSubscription<E>,
  ): Promise<void>;
}

export class EventPublishError extends Error {
  constructor(
    readonly event: Pick<DomainEvent, "id" | "type">,
    options?: { cause?: unknown },
  ) {
    super(`Could not publish ${event.type} (${event.id})`, options);
  }
}

// Same semantics as RabbitMQ topic bindings.
export function matchesEventType(pattern: string, type: string): boolean {
  const match = (p: string[], t: string[]): boolean => {
    if (p.length === 0) return t.length === 0;
    const [head, ...rest] = p;
    if (head === "#") {
      return match(rest, t) || (t.length > 0 && match(p, t.slice(1)));
    }
    if (t.length === 0) return false;
    return (head === "*" || head === t[0]) && match(rest, t.slice(1));
  };
  return match(pattern.split("."), type.split("."));
}
