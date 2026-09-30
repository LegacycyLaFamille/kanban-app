import type { Channel, ConfirmChannel, ConsumeMessage } from "amqplib";
import { parseDomainEvent, type DomainEvent } from "../DomainEvent.js";
import {
  EventPublishError,
  type EventBus,
  type EventSubscription,
} from "../EventBus.js";
import type { Logger, RabbitMqConnection } from "./RabbitMqConnection.js";
import { EVENTS_EXCHANGE, declareTopology } from "./topology.js";

const prefix = "[event-bus]";
const consoleLogger: Logger = {
  info: (m) => console.log(`${prefix} ${m}`),
  warn: (m) => console.warn(`${prefix} ${m}`),
  error: (m) => console.error(`${prefix} ${m}`),
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// RabbitMQ implementation of the Event Bus:
// - publish: persistent message on the `kanban.events` topic exchange, the
//   event type as routing key, confirmed by the broker before resolving;
// - subscribe: one durable queue per subscription, bound to its event types,
//   dead-lettered on failure. Consumers are re-created after every
//   reconnection.
export class RabbitMqEventBus implements EventBus {
  private publishChannel: Promise<ConfirmChannel> | null = null;
  private readonly subscriptions: EventSubscription[] = [];
  // Consumers with an open channel, so one is never started twice.
  private readonly active = new Set<string>();

  constructor(
    private readonly connection: RabbitMqConnection,
    private readonly logger: Logger = consoleLogger,
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
    } catch (error) {
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
          this.logger.error(`Publish channel error: ${errorMessage(error)}`);
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
        this.logger.error(
          `Could not start consumer ${subscription.name}: ${errorMessage(error)}`,
        );
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
    const channel = await this.connection.createChannel();
    channel.on("error", (error: unknown) => {
      this.logger.error(
        `Consumer ${subscription.name} channel error: ${errorMessage(error)}`,
      );
    });
    channel.on("close", () => this.active.delete(subscription.name));

    await declareTopology(channel, {
      exchanges: [],
      queues: [
        {
          name: subscription.name,
          exchange: EVENTS_EXCHANGE,
          bindings: subscription.eventTypes,
          deadLetter: true,
        },
      ],
    });

    await channel.consume(subscription.name, (message) => {
      // null means the broker cancelled the consumer (e.g. queue deleted).
      if (message === null) {
        this.logger.warn(`Consumer ${subscription.name} cancelled by broker`);
        return;
      }
      void this.handle(channel, subscription, message);
    });
    this.logger.info(
      `Consumer ${subscription.name} listening to ${subscription.eventTypes.join(", ")}`,
    );
  }

  private async handle(
    channel: Channel,
    subscription: EventSubscription,
    message: ConsumeMessage,
  ): Promise<void> {
    let event: DomainEvent;
    try {
      event = parseDomainEvent(JSON.parse(message.content.toString("utf8")));
    } catch (error) {
      this.logger.error(
        `Consumer ${subscription.name} rejected unreadable message ` +
          `${message.properties.messageId ?? "(no id)"}: ${errorMessage(error)}`,
      );
      this.settle(channel, message, false);
      return;
    }

    try {
      await subscription.handler(event);
      this.settle(channel, message, true);
    } catch (error) {
      this.logger.error(
        `Consumer ${subscription.name} failed on ${event.type} ${event.id}, ` +
          `sent to dead-letter: ${errorMessage(error)}`,
      );
      this.settle(channel, message, false);
    }
  }

  // If the channel closed meanwhile, the broker redelivers the message on
  // the next connection: nothing else to do here.
  private settle(channel: Channel, message: ConsumeMessage, ok: boolean) {
    try {
      if (ok) channel.ack(message);
      else channel.nack(message, false, false);
    } catch (error) {
      this.logger.warn(
        `Could not ${ok ? "ack" : "nack"} message, it will be redelivered: ${errorMessage(error)}`,
      );
    }
  }
}
