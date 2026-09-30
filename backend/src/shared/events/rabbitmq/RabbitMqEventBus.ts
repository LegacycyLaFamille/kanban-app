import type { ConfirmChannel, ConsumeMessage, Options } from "amqplib";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { parseDomainEvent, type DomainEvent } from "../DomainEvent.js";
import {
  EventPublishError,
  NonRetryableEventError,
  type EventBus,
  type EventSubscription,
} from "../EventBus.js";
import {
  createEventLogger,
  errorMessage,
  type EventLogger,
} from "../eventLogger.js";
import type { RabbitMqConnection } from "./RabbitMqConnection.js";
import {
  eventMetrics,
  type EventMetrics,
} from "../../observability/eventMetrics.js";
import {
  DEAD_LETTER_EXCHANGE,
  EVENTS_EXCHANGE,
  declareTopology,
} from "./topology.js";

export interface RetryPolicy {
  // Retries after the first attempt: maxRetries + 1 attempts in total.
  maxRetries: number;
  // Wait before each retry. Fixed per consumer: changing it requires
  // deleting the existing `<consumer>.retry` queue (its TTL is immutable).
  delayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  delayMs: 5_000,
};

// Headers carried by retried and dead-lettered messages.
export const RETRY_COUNT_HEADER = "x-retry-count";
export const FAILED_CONSUMER_HEADER = "x-failed-consumer";
export const FAILURE_REASON_HEADER = "x-failure-reason";

export const retryQueueName = (consumer: string) => `${consumer}.retry`;

function retryCount(message: ConsumeMessage): number {
  const value: unknown = message.properties.headers?.[RETRY_COUNT_HEADER];
  return typeof value === "number" && value >= 0 ? value : 0;
}

// RabbitMQ implementation of the Event Bus:
// - publish: persistent message on the `kanban.events` topic exchange, the
//   event type as routing key, confirmed by the broker before resolving;
// - subscribe: one durable queue per subscription, bound to its event types.
//   A failed event is re-queued for this consumer only, through
//   `<consumer>.retry` (TTL = retry delay), up to maxRetries times, then
//   published to the dead-letter exchange. A message is acknowledged only
//   once its copy (retry or dead-letter) is confirmed by the broker.
//   Consumers are re-created after every reconnection.
export class RabbitMqEventBus implements EventBus {
  private publishChannel: Promise<ConfirmChannel> | null = null;
  private readonly subscriptions: EventSubscription[] = [];
  // Consumers with an open channel, so one is never started twice.
  private readonly active = new Set<string>();

  constructor(
    private readonly connection: RabbitMqConnection,
    private readonly logger: EventLogger = createEventLogger("event-bus"),
    private readonly retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY,
    private readonly metrics: EventMetrics = eventMetrics,
  ) {
    connection.onConnected(() => this.startConsumers());
  }

  async publish(event: DomainEvent): Promise<void> {
    try {
      const channel = await this.getPublishChannel();
      const body = Buffer.from(JSON.stringify(event));

      await new Promise<void>((resolve, reject) => {
        channel.publish(
          EVENTS_EXCHANGE,
          event.type,
          body,
          {
            persistent: true,
            contentType: "application/json",
            messageId: event.id,
            type: event.type,
            timestamp: Math.floor(Date.parse(event.occurredAt) / 1000),
            appId: "kanban-backend",
          },
          (err: unknown) => (err ? reject(err) : resolve()),
        );
      });
      this.metrics.published(event.type, "success");
    } catch (error) {
      this.metrics.published(event.type, "failure");
      throw new EventPublishError(event, { cause: error });
    }
  }

  async subscribe<E extends DomainEvent>(
    subscription: EventSubscription<E>,
  ): Promise<void> {
    if (this.subscriptions.some((s) => s.name === subscription.name)) {
      throw new Error(`Subscription "${subscription.name}" already exists`);
    }
    const registered = subscription as unknown as EventSubscription;
    this.subscriptions.push(registered);

    // Otherwise it starts on the next (re)connection.
    if (this.connection.isConnected()) await this.startConsumer(registered);
  }

  private getPublishChannel(): Promise<ConfirmChannel> {
    if (this.publishChannel === null) {
      const opening = this.connection.createConfirmChannel().then((channel) => {
        channel.on("error", (error: unknown) => {
          this.logger.error("Publish channel error", {
            error: errorMessage(error),
          });
        });
        channel.on("close", () => {
          if (this.publishChannel === opening) this.publishChannel = null;
        });
        return channel;
      });
      opening.catch(() => {
        if (this.publishChannel === opening) this.publishChannel = null;
      });
      this.publishChannel = opening;
    }
    return this.publishChannel;
  }

  private async startConsumers(): Promise<void> {
    for (const subscription of this.subscriptions) {
      try {
        await this.startConsumer(subscription);
      } catch (error) {
        this.logger.error("Could not start consumer", {
          consumer: subscription.name,
          error: errorMessage(error),
        });
      }
    }
  }

  private async startConsumer(subscription: EventSubscription): Promise<void> {
    if (this.active.has(subscription.name)) return;
    this.active.add(subscription.name);
    try {
      await this.openConsumer(subscription);
    } catch (error) {
      this.active.delete(subscription.name);
      throw error;
    }
  }

  private async openConsumer(subscription: EventSubscription): Promise<void> {
    const consumer = subscription.name;
    // Confirm channel: retry and dead-letter copies are confirmed by the
    // broker before the original message is acknowledged.
    const channel = await this.connection.createConfirmChannel();
    channel.on("error", (error: unknown) => {
      this.logger.error("Consumer channel error", {
        consumer,
        error: errorMessage(error),
      });
    });
    channel.on("close", () => this.active.delete(consumer));

    await declareTopology(channel, {
      exchanges: [],
      queues: [
        {
          name: consumer,
          exchange: EVENTS_EXCHANGE,
          bindings: subscription.eventTypes,
          deadLetter: true,
        },
      ],
    });
    // Expired messages go back to this consumer's queue only (default
    // exchange, routing key = queue name), not to every subscriber.
    await channel.assertQueue(retryQueueName(consumer), {
      durable: true,
      messageTtl: this.retryPolicy.delayMs,
      deadLetterExchange: "",
      deadLetterRoutingKey: consumer,
    });

    await channel.consume(consumer, (message) => {
      // null means the broker cancelled the consumer (e.g. queue deleted).
      if (message === null) {
        this.logger.warn("Consumer cancelled by broker", { consumer });
        return;
      }
      void this.handle(channel, subscription, message);
    });
    this.logger.info("Consumer started", {
      consumer,
      eventTypes: subscription.eventTypes,
      maxAttempts: this.retryPolicy.maxRetries + 1,
      retryDelayMs: this.retryPolicy.delayMs,
    });
  }

  private async handle(
    channel: ConfirmChannel,
    subscription: EventSubscription,
    message: ConsumeMessage,
  ): Promise<void> {
    const consumer = subscription.name;
    const maxAttempts = this.retryPolicy.maxRetries + 1;

    let event: DomainEvent;
    try {
      event = parseDomainEvent(JSON.parse(message.content.toString("utf8")));
    } catch (error) {
      // Retrying cannot fix an unreadable message.
      this.metrics.consumed(consumer, "unknown", "unreadable");
      const reason = errorMessage(error);
      this.logger.error("Unreadable message sent to dead-letter", {
        consumer,
        messageId: message.properties.messageId ?? null,
        error: reason,
      });
      await this.forward(channel, message, {
        exchange: DEAD_LETTER_EXCHANGE,
        routingKey: "unreadable",
        headers: {
          [FAILED_CONSUMER_HEADER]: consumer,
          [FAILURE_REASON_HEADER]: reason,
        },
      });
      return;
    }

    const attempt = retryCount(message) + 1;
    const span = trace.getActiveSpan();
    span?.setAttributes({
      "kanban.event.id": event.id,
      "kanban.event.type": event.type,
      "kanban.consumer": consumer,
      "kanban.event.attempt": attempt,
    });
    const startedAt = performance.now();
    const elapsed = () => (performance.now() - startedAt) / 1000;
    const context = {
      eventId: event.id,
      eventType: event.type,
      consumer,
      attempt,
      maxAttempts,
    };

    try {
      await subscription.handler(event);
    } catch (error) {
      const reason = errorMessage(error);
      span?.recordException(error instanceof Error ? error : reason);
      span?.setStatus({ code: SpanStatusCode.ERROR, message: reason });
      const retryable =
        !(error instanceof NonRetryableEventError) && attempt < maxAttempts;

      if (retryable) {
        this.metrics.consumed(consumer, event.type, "retry", elapsed());
        this.logger.warn("Event processing failed, retry scheduled", {
          ...context,
          retryInMs: this.retryPolicy.delayMs,
          error: reason,
        });
        await this.forward(channel, message, {
          exchange: "",
          routingKey: retryQueueName(consumer),
          headers: {
            [RETRY_COUNT_HEADER]: attempt,
            [FAILURE_REASON_HEADER]: reason,
          },
        });
      } else {
        this.metrics.consumed(consumer, event.type, "dead_letter", elapsed());
        this.logger.error("Event processing failed, sent to dead-letter", {
          ...context,
          nonRetryable: error instanceof NonRetryableEventError,
          error: reason,
        });
        await this.forward(channel, message, {
          exchange: DEAD_LETTER_EXCHANGE,
          routingKey: event.type,
          headers: {
            [RETRY_COUNT_HEADER]: attempt - 1,
            [FAILED_CONSUMER_HEADER]: consumer,
            [FAILURE_REASON_HEADER]: reason,
          },
        });
      }
      return;
    }

    this.metrics.consumed(consumer, event.type, "success", elapsed());
    if (attempt > 1) {
      this.logger.info("Event processed after retry", context);
    }
    this.settle(channel, message, "ack");
  }

  // Publishes a copy of the message (same body and properties, extra
  // headers) and acknowledges the original once the broker confirmed it.
  // If the copy fails, the original is requeued rather than lost.
  private async forward(
    channel: ConfirmChannel,
    message: ConsumeMessage,
    target: {
      exchange: string;
      routingKey: string;
      headers: Record<string, unknown>;
    },
  ): Promise<void> {
    const { headers, ...properties } = message.properties;
    const options: Options.Publish = {
      ...(properties as Options.Publish),
      persistent: true,
      headers: { ...headers, ...target.headers },
    };
    try {
      await new Promise<void>((resolve, reject) => {
        channel.publish(
          target.exchange,
          target.routingKey,
          message.content,
          options,
          (err: unknown) => (err ? reject(err) : resolve()),
        );
      });
    } catch (error) {
      this.logger.error("Could not forward message, requeued", {
        messageId: message.properties.messageId ?? null,
        target: target.routingKey,
        error: errorMessage(error),
      });
      this.settle(channel, message, "requeue");
      return;
    }
    this.settle(channel, message, "ack");
  }

  // If the channel closed meanwhile, the broker redelivers the message on
  // the next connection: nothing else to do here.
  private settle(
    channel: ConfirmChannel,
    message: ConsumeMessage,
    outcome: "ack" | "requeue",
  ) {
    try {
      if (outcome === "ack") channel.ack(message);
      else channel.nack(message, false, true);
    } catch (error) {
      this.logger.warn("Could not settle message, it will be redelivered", {
        messageId: message.properties.messageId ?? null,
        error: errorMessage(error),
      });
    }
  }
}
