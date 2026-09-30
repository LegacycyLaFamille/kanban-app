import { parseDomainEvent, type DomainEvent } from "./DomainEvent.js";
import {
  matchesEventType,
  type EventBus,
  type EventSubscription,
} from "./EventBus.js";

// Test double with the same contract as the RabbitMQ implementation: events
// go through a JSON round trip (so non-serializable payloads fail here too)
// and handler failures never reach the publisher.
export class InMemoryEventBus implements EventBus {
  readonly published: DomainEvent[] = [];
  readonly failures: Array<{
    subscription: string;
    event: DomainEvent;
    error: unknown;
  }> = [];
  private readonly subscriptions: EventSubscription[] = [];

  async publish(event: DomainEvent): Promise<void> {
    const delivered = parseDomainEvent(JSON.parse(JSON.stringify(event)));
    this.published.push(delivered);

    await Promise.all(
      this.subscriptions
        .filter((s) =>
          s.eventTypes.some((p) => matchesEventType(p, event.type)),
        )
        .map(async (subscription) => {
          try {
            await subscription.handler(delivered);
          } catch (error) {
            this.failures.push({
              subscription: subscription.name,
              event: delivered,
              error,
            });
          }
        }),
    );
  }

  async subscribe<E extends DomainEvent>(
    subscription: EventSubscription<E>,
  ): Promise<void> {
    if (this.subscriptions.some((s) => s.name === subscription.name)) {
      throw new Error(`Subscription "${subscription.name}" already exists`);
    }
    this.subscriptions.push(subscription as unknown as EventSubscription);
  }

  publishedOfType<T extends string>(type: T): DomainEvent<T>[] {
    return this.published.filter((e): e is DomainEvent<T> => e.type === type);
  }
}
