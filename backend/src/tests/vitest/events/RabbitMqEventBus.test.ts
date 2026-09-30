import { EventEmitter } from "node:events";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConsumeMessage } from "amqplib";
import { createEvent } from "../../../shared/events/DomainEvent.js";
import {
  EventPublishError,
  NonRetryableEventError,
} from "../../../shared/events/EventBus.js";
import {
  RabbitMqNotConnectedError,
  type RabbitMqConnection,
} from "../../../shared/events/rabbitmq/RabbitMqConnection.js";
import {
  FAILED_CONSUMER_HEADER,
  FAILURE_REASON_HEADER,
  RETRY_COUNT_HEADER,
  RabbitMqEventBus,
} from "../../../shared/events/rabbitmq/RabbitMqEventBus.js";
import {
  DEAD_LETTER_EXCHANGE,
  EVENTS_EXCHANGE,
} from "../../../shared/events/rabbitmq/topology.js";

type Consumer = (message: ConsumeMessage | null) => void;
type PublishCallback = (err: unknown) => void;

function fakeChannel() {
  const emitter = new EventEmitter();
  let consumer: Consumer | null = null;
  const channel = Object.assign(emitter, {
    confirmError: null as Error | null,
    publish: vi.fn(
      (
        _exchange: string,
        _key: string,
        _body: Buffer,
        _options: Record<string, unknown>,
        callback: PublishCallback,
      ) => {
        callback(channel.confirmError);
        return true;
      },
    ),
    assertExchange: vi.fn().mockResolvedValue({}),
    assertQueue: vi.fn().mockResolvedValue({}),
    bindQueue: vi.fn().mockResolvedValue({}),
    consume: vi.fn(async (_queue: string, fn: Consumer) => {
      consumer = fn;
      return { consumerTag: "tag" };
    }),
    ack: vi.fn(),
    nack: vi.fn(),
    deliver(
      content: string,
      properties: Record<string, unknown> = { messageId: "m1" },
    ) {
      consumer?.({
        content: Buffer.from(content),
        properties,
      } as unknown as ConsumeMessage);
    },
  });
  return channel;
}

type FakeChannel = ReturnType<typeof fakeChannel>;

function fakeConnection(connected = true) {
  const listeners: Array<() => Promise<void> | void> = [];
  const channels: FakeChannel[] = [];
  const state = { connected };
  const connection = {
    isConnected: () => state.connected,
    onConnected: (l: () => Promise<void> | void) => listeners.push(l),
    createConfirmChannel: vi.fn(async () => {
      if (!state.connected) throw new RabbitMqNotConnectedError("disconnected");
      const channel = fakeChannel();
      channels.push(channel);
      return channel;
    }),
  };
  return {
    connection: connection as unknown as RabbitMqConnection,
    raw: connection,
    channels,
    state,
    async reconnect() {
      state.connected = true;
      for (const listener of listeners) await listener();
    },
  };
}

const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("RabbitMqEventBus.publish", () => {
  it("publie un message persistant, routé par type, confirmé par le broker", async () => {
    const { connection, channels } = fakeConnection();
    const bus = new RabbitMqEventBus(connection, logger());
    const event = createEvent("task.created", { taskId: "t1" });

    await bus.publish(event);

    const [exchange, routingKey, body, options] =
      channels[0]!.publish.mock.calls[0]!;
    expect(exchange).toBe(EVENTS_EXCHANGE);
    expect(routingKey).toBe("task.created");
    expect(JSON.parse(body.toString())).toEqual(event);
    expect(options).toMatchObject({
      persistent: true,
      contentType: "application/json",
      messageId: event.id,
      type: "task.created",
    });
  });

  it("réutilise le même canal de publication", async () => {
    const { connection, raw } = fakeConnection();
    const bus = new RabbitMqEventBus(connection, logger());

    await bus.publish(createEvent("task.created", {}));
    await bus.publish(createEvent("task.updated", {}));

    expect(raw.createConfirmChannel).toHaveBeenCalledOnce();
  });

  it("échoue avec EventPublishError quand le broker est indisponible", async () => {
    const { connection } = fakeConnection(false);
    const bus = new RabbitMqEventBus(connection, logger());

    await expect(bus.publish(createEvent("task.created", {}))).rejects.toThrow(
      EventPublishError,
    );
  });

  it("échoue quand le broker refuse la publication (nack)", async () => {
    const { connection, channels } = fakeConnection();
    const bus = new RabbitMqEventBus(connection, logger());
    await bus.publish(createEvent("task.created", {}));
    channels[0]!.confirmError = new Error("message nacked");

    await expect(bus.publish(createEvent("task.created", {}))).rejects.toThrow(
      EventPublishError,
    );
  });

  it("rouvre un canal après la fermeture du précédent", async () => {
    const { connection, raw, channels } = fakeConnection();
    const bus = new RabbitMqEventBus(connection, logger());
    await bus.publish(createEvent("task.created", {}));

    channels[0]!.emit("close");
    await bus.publish(createEvent("task.created", {}));

    expect(raw.createConfirmChannel).toHaveBeenCalledTimes(2);
  });
});

describe("RabbitMqEventBus.subscribe", () => {
  const CONSUMER = "notifications.task-events";
  let fake: ReturnType<typeof fakeConnection>;
  let log: ReturnType<typeof logger>;
  let bus: RabbitMqEventBus;
  const handler = vi.fn();
  const channel = () => fake.channels[0]!;

  beforeEach(async () => {
    handler.mockReset().mockResolvedValue(undefined);
    fake = fakeConnection();
    log = logger();
    bus = new RabbitMqEventBus(fake.connection, log, {
      maxRetries: 2,
      delayMs: 1_000,
    });
    await bus.subscribe({
      name: CONSUMER,
      eventTypes: ["task.created", "task.updated"],
      handler,
    });
  });

  it("déclare une queue durable liée aux types et sa queue de retry", () => {
    expect(channel().bindQueue).toHaveBeenCalledWith(
      CONSUMER,
      EVENTS_EXCHANGE,
      "task.created",
    );
    expect(channel().bindQueue).toHaveBeenCalledWith(
      CONSUMER,
      EVENTS_EXCHANGE,
      "task.updated",
    );
    // Expired retries go back to this consumer's queue only.
    expect(channel().assertQueue).toHaveBeenCalledWith(`${CONSUMER}.retry`, {
      durable: true,
      messageTtl: 1_000,
      deadLetterExchange: "",
      deadLetterRoutingKey: CONSUMER,
    });
  });

  it("passe l'événement au handler puis acquitte le message", async () => {
    const event = createEvent("task.created", { taskId: "t1" });

    channel().deliver(JSON.stringify(event));
    await flush();

    expect(handler).toHaveBeenCalledWith(event);
    expect(channel().ack).toHaveBeenCalledOnce();
    expect(channel().publish).not.toHaveBeenCalled();
  });

  it("programme un retry vers la queue du consumer, puis acquitte l'original", async () => {
    handler.mockRejectedValue(new Error("db down"));
    const event = createEvent("task.created", {});

    channel().deliver(JSON.stringify(event), {
      messageId: event.id,
      headers: {},
    });
    await flush();

    const [exchange, routingKey, , options] = channel().publish.mock.calls[0]!;
    expect(exchange).toBe("");
    expect(routingKey).toBe(`${CONSUMER}.retry`);
    expect(options.headers).toMatchObject({
      [RETRY_COUNT_HEADER]: 1,
      [FAILURE_REASON_HEADER]: "db down",
    });
    expect(options).toMatchObject({ messageId: event.id, persistent: true });
    expect(channel().ack).toHaveBeenCalledOnce();
    expect(log.warn).toHaveBeenCalledWith(
      "Event processing failed, retry scheduled",
      expect.objectContaining({
        eventId: event.id,
        eventType: "task.created",
        consumer: CONSUMER,
        attempt: 1,
        maxAttempts: 3,
        error: "db down",
      }),
    );
  });

  it("envoie en dead-letter après la dernière tentative, avec la cause", async () => {
    handler.mockRejectedValue(new Error("db down"));
    const event = createEvent("task.created", {});

    // Third delivery: already retried twice (maxRetries = 2).
    channel().deliver(JSON.stringify(event), {
      messageId: event.id,
      headers: { [RETRY_COUNT_HEADER]: 2 },
    });
    await flush();

    const [exchange, routingKey, , options] = channel().publish.mock.calls[0]!;
    expect(exchange).toBe(DEAD_LETTER_EXCHANGE);
    expect(routingKey).toBe("task.created");
    expect(options.headers).toMatchObject({
      [RETRY_COUNT_HEADER]: 2,
      [FAILED_CONSUMER_HEADER]: CONSUMER,
      [FAILURE_REASON_HEADER]: "db down",
    });
    expect(channel().ack).toHaveBeenCalledOnce();
    expect(log.error).toHaveBeenCalledWith(
      "Event processing failed, sent to dead-letter",
      expect.objectContaining({
        eventId: event.id,
        attempt: 3,
        maxAttempts: 3,
      }),
    );
  });

  it("n'essaie pas de nouveau une erreur non réessayable", async () => {
    handler.mockRejectedValue(new NonRetryableEventError("bad payload"));

    channel().deliver(JSON.stringify(createEvent("task.created", {})));
    await flush();

    expect(channel().publish.mock.calls[0]![0]).toBe(DEAD_LETTER_EXCHANGE);
    expect(log.error).toHaveBeenCalledWith(
      "Event processing failed, sent to dead-letter",
      expect.objectContaining({ attempt: 1, nonRetryable: true }),
    );
  });

  it("journalise un succès obtenu après retry", async () => {
    const event = createEvent("task.created", {});

    channel().deliver(JSON.stringify(event), {
      headers: { [RETRY_COUNT_HEADER]: 1 },
    });
    await flush();

    expect(channel().ack).toHaveBeenCalledOnce();
    expect(log.info).toHaveBeenCalledWith(
      "Event processed after retry",
      expect.objectContaining({ eventId: event.id, attempt: 2 }),
    );
  });

  it("envoie directement un message illisible en dead-letter, sans retry", async () => {
    channel().deliver("{not json", { messageId: "bad-1" });
    await flush();

    expect(handler).not.toHaveBeenCalled();
    const [exchange, routingKey, , options] = channel().publish.mock.calls[0]!;
    expect(exchange).toBe(DEAD_LETTER_EXCHANGE);
    expect(routingKey).toBe("unreadable");
    expect(options.headers).toMatchObject({
      [FAILED_CONSUMER_HEADER]: CONSUMER,
    });
    expect(log.error).toHaveBeenCalledWith(
      "Unreadable message sent to dead-letter",
      expect.objectContaining({ messageId: "bad-1" }),
    );
  });

  it("remet le message en queue si la copie n'est pas confirmée", async () => {
    handler.mockRejectedValue(new Error("db down"));
    channel().confirmError = new Error("channel closed");

    channel().deliver(JSON.stringify(createEvent("task.created", {})));
    await flush();

    expect(channel().ack).not.toHaveBeenCalled();
    expect(channel().nack).toHaveBeenCalledWith(expect.anything(), false, true);
  });

  it("recrée le consumer après une reconnexion, sans doublon", async () => {
    channel().emit("close");

    await fake.reconnect();
    await fake.reconnect();

    expect(fake.channels).toHaveLength(2);
    expect(fake.channels[1]!.consume).toHaveBeenCalledOnce();
  });

  it("démarre à la connexion un abonnement fait hors connexion", async () => {
    const offline = fakeConnection(false);
    const lateBus = new RabbitMqEventBus(offline.connection, logger());
    await lateBus.subscribe({
      name: "notifications.late",
      eventTypes: ["task.created"],
      handler,
    });
    expect(offline.channels).toHaveLength(0);

    await offline.reconnect();

    expect(offline.channels[0]!.consume).toHaveBeenCalledWith(
      "notifications.late",
      expect.any(Function),
    );
  });

  it("refuse deux abonnements du même nom", async () => {
    await expect(
      bus.subscribe({ name: CONSUMER, eventTypes: ["task.created"], handler }),
    ).rejects.toThrow("already exists");
  });
});

describe("RabbitMqEventBus - incidents", () => {
  it("journalise les erreurs du canal de publication", async () => {
    const { connection, channels } = fakeConnection();
    const log = logger();
    const bus = new RabbitMqEventBus(connection, log);
    await bus.publish(createEvent("task.created", {}));

    channels[0]!.emit("error", new Error("PRECONDITION_FAILED"));

    expect(log.error).toHaveBeenCalledWith("Publish channel error", {
      error: "PRECONDITION_FAILED",
    });
  });

  it("journalise l'échec de démarrage d'un consumer et le relance à la connexion suivante", async () => {
    const fake = fakeConnection(false);
    const log = logger();
    const bus = new RabbitMqEventBus(fake.connection, log);
    await bus.subscribe({
      name: "test.consumer",
      eventTypes: ["task.created"],
      handler: vi.fn(),
    });
    fake.raw.createConfirmChannel.mockRejectedValueOnce(new Error("boom"));

    await fake.reconnect();
    expect(log.error).toHaveBeenCalledWith("Could not start consumer", {
      consumer: "test.consumer",
      error: "boom",
    });

    await fake.reconnect();
    expect(fake.channels[0]!.consume).toHaveBeenCalledOnce();
  });

  it("journalise les erreurs du canal d'un consumer et son annulation par le broker", async () => {
    const fake = fakeConnection();
    const log = logger();
    const bus = new RabbitMqEventBus(fake.connection, log);
    await bus.subscribe({
      name: "test.consumer",
      eventTypes: ["task.created"],
      handler: vi.fn(),
    });
    const channel = fake.channels[0]!;

    channel.emit("error", new Error("channel reset"));
    const consume = channel.consume.mock.calls[0]![1];
    consume(null);

    expect(log.error).toHaveBeenCalledWith("Consumer channel error", {
      consumer: "test.consumer",
      error: "channel reset",
    });
    expect(log.warn).toHaveBeenCalledWith("Consumer cancelled by broker", {
      consumer: "test.consumer",
    });
  });

  it("n'échoue pas si l'acquittement est impossible (le broker relivrera)", async () => {
    const fake = fakeConnection();
    const log = logger();
    const bus = new RabbitMqEventBus(fake.connection, log);
    await bus.subscribe({
      name: "test.consumer",
      eventTypes: ["task.created"],
      handler: vi.fn().mockResolvedValue(undefined),
    });
    const channel = fake.channels[0]!;
    channel.ack.mockImplementation(() => {
      throw new Error("Channel closed");
    });

    channel.deliver(JSON.stringify(createEvent("task.created", {})));
    await flush();

    expect(log.warn).toHaveBeenCalledWith(
      "Could not settle message, it will be redelivered",
      expect.objectContaining({ error: "Channel closed" }),
    );
  });
});
