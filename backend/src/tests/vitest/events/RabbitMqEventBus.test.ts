import { EventEmitter } from "node:events";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConsumeMessage } from "amqplib";
import { createEvent } from "../../../shared/events/DomainEvent.js";
import { EventPublishError } from "../../../shared/events/EventBus.js";
import {
  RabbitMqNotConnectedError,
  type RabbitMqConnection,
} from "../../../shared/events/rabbitmq/RabbitMqConnection.js";
import { RabbitMqEventBus } from "../../../shared/events/rabbitmq/RabbitMqEventBus.js";
import {
  DEAD_LETTER_EXCHANGE,
  EVENTS_EXCHANGE,
} from "../../../shared/events/rabbitmq/topology.js";

type Consumer = (message: ConsumeMessage | null) => void;

function fakeChannel() {
  const emitter = new EventEmitter();
  let consumer: Consumer | null = null;
  return Object.assign(emitter, {
    publish: vi.fn(
      (
        _exchange: string,
        _key: string,
        _body: Buffer,
        _options: unknown,
        callback: (err: unknown) => void,
      ) => {
        callback(null);
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
    deliver(content: string, messageId = "m1") {
      consumer?.({
        content: Buffer.from(content),
        properties: { messageId },
      } as unknown as ConsumeMessage);
    },
  });
}

function fakeConnection(connected = true) {
  const listeners: Array<() => Promise<void> | void> = [];
  const channels: ReturnType<typeof fakeChannel>[] = [];
  const confirm = fakeChannel();
  const state = { connected };
  const connection = {
    isConnected: () => state.connected,
    onConnected: (l: () => Promise<void> | void) => listeners.push(l),
    createChannel: vi.fn(async () => {
      if (!state.connected) throw new RabbitMqNotConnectedError("disconnected");
      const channel = fakeChannel();
      channels.push(channel);
      return channel;
    }),
    createConfirmChannel: vi.fn(async () => {
      if (!state.connected) throw new RabbitMqNotConnectedError("disconnected");
      return confirm;
    }),
  };
  return {
    connection: connection as unknown as RabbitMqConnection,
    raw: connection,
    channels,
    confirm,
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
    const { connection, confirm } = fakeConnection();
    const bus = new RabbitMqEventBus(connection, logger());
    const event = createEvent("task.created", { taskId: "t1" });

    await bus.publish(event);

    const [exchange, routingKey, body, options] =
      confirm.publish.mock.calls[0]!;
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
    const { connection, confirm } = fakeConnection();
    confirm.publish.mockImplementationOnce((...args) => {
      args[4](new Error("message nacked"));
      return true;
    });
    const bus = new RabbitMqEventBus(connection, logger());

    await expect(bus.publish(createEvent("task.created", {}))).rejects.toThrow(
      EventPublishError,
    );
  });

  it("rouvre un canal après la fermeture du précédent", async () => {
    const { connection, raw, confirm } = fakeConnection();
    const bus = new RabbitMqEventBus(connection, logger());
    await bus.publish(createEvent("task.created", {}));

    confirm.emit("close");
    await bus.publish(createEvent("task.created", {}));

    expect(raw.createConfirmChannel).toHaveBeenCalledTimes(2);
  });
});

describe("RabbitMqEventBus.subscribe", () => {
  let fake: ReturnType<typeof fakeConnection>;
  let log: ReturnType<typeof logger>;
  let bus: RabbitMqEventBus;
  const handler = vi.fn();

  beforeEach(async () => {
    handler.mockReset().mockResolvedValue(undefined);
    fake = fakeConnection();
    log = logger();
    bus = new RabbitMqEventBus(fake.connection, log);
    await bus.subscribe({
      name: "notifications.task-events",
      eventTypes: ["task.created", "task.updated"],
      handler,
    });
  });

  it("déclare une queue durable avec dead-letter, liée aux types demandés", () => {
    const channel = fake.channels[0]!;

    expect(channel.assertQueue).toHaveBeenCalledWith(
      "notifications.task-events",
      { durable: true, deadLetterExchange: DEAD_LETTER_EXCHANGE },
    );
    expect(channel.bindQueue).toHaveBeenCalledWith(
      "notifications.task-events",
      EVENTS_EXCHANGE,
      "task.created",
    );
    expect(channel.bindQueue).toHaveBeenCalledWith(
      "notifications.task-events",
      EVENTS_EXCHANGE,
      "task.updated",
    );
  });

  it("passe l'événement au handler puis acquitte le message", async () => {
    const event = createEvent("task.created", { taskId: "t1" });
    const channel = fake.channels[0]!;

    channel.deliver(JSON.stringify(event));
    await flush();

    expect(handler).toHaveBeenCalledWith(event);
    expect(channel.ack).toHaveBeenCalledOnce();
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it("envoie en dead-letter quand le handler échoue, avec l'id dans les logs", async () => {
    handler.mockRejectedValue(new Error("db down"));
    const event = createEvent("task.created", {});
    const channel = fake.channels[0]!;

    channel.deliver(JSON.stringify(event));
    await flush();

    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining(`task.created ${event.id}`),
    );
  });

  it("rejette un message illisible sans appeler le handler", async () => {
    const channel = fake.channels[0]!;

    channel.deliver("{not json", "bad-1");
    channel.deliver(JSON.stringify({ type: "task.created" }), "bad-2");
    await flush();

    expect(handler).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledTimes(2);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining("bad-1"));
  });

  it("recrée le consumer après une reconnexion, sans doublon", async () => {
    fake.channels[0]!.emit("close");

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
      bus.subscribe({
        name: "notifications.task-events",
        eventTypes: ["task.created"],
        handler,
      }),
    ).rejects.toThrow("already exists");
  });
});
