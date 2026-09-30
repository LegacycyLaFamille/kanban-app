import { EventEmitter } from "node:events";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Channel } from "amqplib";
import {
  RabbitMqConnection,
  RabbitMqNotConnectedError,
  type Logger,
} from "../../../shared/events/rabbitmq/RabbitMqConnection.js";
import {
  DEAD_LETTER_EXCHANGE,
  DEAD_LETTER_QUEUE,
  EVENTS_EXCHANGE,
  declareTopology,
  defaultTopology,
  withQueues,
} from "../../../shared/events/rabbitmq/topology.js";

const config = {
  url: "amqp://u:secret@broker:5672/%2F",
  safeUrl: "amqp://u:***@broker:5672/%2F",
  prefetch: 5,
};

function fakeChannel() {
  return {
    assertExchange: vi.fn().mockResolvedValue({}),
    assertQueue: vi.fn().mockResolvedValue({}),
    bindQueue: vi.fn().mockResolvedValue({}),
    prefetch: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function fakeModel() {
  const emitter = new EventEmitter();
  const channel = fakeChannel();
  const model = Object.assign(emitter, {
    createChannel: vi.fn().mockResolvedValue(channel),
    createConfirmChannel: vi.fn().mockResolvedValue(channel),
    close: vi.fn(async () => {
      emitter.emit("close");
    }),
  });
  return { model, channel };
}

function silentLogger() {
  return {
    info: vi.fn<Logger["info"]>(),
    warn: vi.fn<Logger["warn"]>(),
    error: vi.fn<Logger["error"]>(),
  };
}

describe("declareTopology", () => {
  it("déclare les exchanges durables, la dead-letter queue et les bindings", async () => {
    const channel = fakeChannel();
    const topology = withQueues(defaultTopology, {
      name: "notifications.task-created",
      exchange: EVENTS_EXCHANGE,
      bindings: ["task.created"],
      deadLetter: true,
    });

    await declareTopology(channel as unknown as Channel, topology);

    expect(channel.assertExchange).toHaveBeenCalledWith(
      EVENTS_EXCHANGE,
      "topic",
      {
        durable: true,
      },
    );
    expect(channel.assertExchange).toHaveBeenCalledWith(
      DEAD_LETTER_EXCHANGE,
      "topic",
      { durable: true },
    );
    expect(channel.assertQueue).toHaveBeenCalledWith(DEAD_LETTER_QUEUE, {
      durable: true,
    });
    expect(channel.assertQueue).toHaveBeenCalledWith(
      "notifications.task-created",
      {
        durable: true,
        deadLetterExchange: DEAD_LETTER_EXCHANGE,
      },
    );
    expect(channel.bindQueue).toHaveBeenCalledWith(
      "notifications.task-created",
      EVENTS_EXCHANGE,
      "task.created",
    );
  });
});

describe("RabbitMqConnection", () => {
  let logger: ReturnType<typeof silentLogger>;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = silentLogger();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reste désactivé et le signale quand aucune configuration n'est fournie", async () => {
    const connect = vi.fn();
    const connection = new RabbitMqConnection(null, {
      topology: defaultTopology,
      logger,
      connect,
    });

    await connection.start();

    expect(connect).not.toHaveBeenCalled();
    expect(connection.status().state).toBe("disabled");
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("without a message broker"),
    );
  });

  it("se connecte, déclare la topologie et ne logge jamais le mot de passe", async () => {
    const { model, channel } = fakeModel();
    const connect = vi.fn().mockResolvedValue(model);
    const connection = new RabbitMqConnection(config, {
      topology: defaultTopology,
      logger,
      connect,
    });

    await connection.start();

    expect(connect).toHaveBeenCalledWith(config.url);
    expect(channel.assertExchange).toHaveBeenCalled();
    expect(connection.status()).toMatchObject({
      state: "connected",
      url: config.safeUrl,
    });
    const logged = logger.info.mock.calls.flat().join(" ");
    expect(logged).not.toContain("secret");
  });

  it("ne plante pas si le broker est indisponible et réessaie avec backoff", async () => {
    const { model } = fakeModel();
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValue(model);
    const connection = new RabbitMqConnection(config, {
      topology: defaultTopology,
      logger,
      connect,
      initialReconnectDelayMs: 100,
    });

    await expect(connection.start()).resolves.toBeUndefined();
    expect(connection.status()).toMatchObject({
      state: "disconnected",
      lastError: "ECONNREFUSED",
      reconnectAttempt: 1,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("retry #1 in 100ms"),
    );

    await vi.advanceTimersByTimeAsync(100);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("retry #2 in 200ms"),
    );

    await vi.advanceTimersByTimeAsync(200);
    expect(connect).toHaveBeenCalledTimes(3);
    expect(connection.status().state).toBe("connected");
  });

  it("plafonne le délai de reconnexion", async () => {
    const connect = vi.fn().mockRejectedValue(new Error("down"));
    const connection = new RabbitMqConnection(config, {
      topology: defaultTopology,
      logger,
      connect,
      initialReconnectDelayMs: 100,
      maxReconnectDelayMs: 250,
    });

    await connection.start();
    await vi.advanceTimersByTimeAsync(100 + 200 + 250);

    expect(logger.warn).toHaveBeenLastCalledWith(
      expect.stringContaining("in 250ms"),
    );
    await connection.close();
  });

  it("se reconnecte après une coupure et redéclare la topologie", async () => {
    const first = fakeModel();
    const second = fakeModel();
    const connect = vi
      .fn()
      .mockResolvedValueOnce(first.model)
      .mockResolvedValueOnce(second.model);
    const connection = new RabbitMqConnection(config, {
      topology: defaultTopology,
      logger,
      connect,
      initialReconnectDelayMs: 50,
    });
    await connection.start();

    first.model.emit("error", new Error("heartbeat timeout"));
    first.model.emit("close", new Error("heartbeat timeout"));

    expect(connection.status().state).toBe("disconnected");
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("heartbeat timeout"),
    );

    await vi.advanceTimersByTimeAsync(50);
    expect(connection.status().state).toBe("connected");
    expect(second.channel.assertExchange).toHaveBeenCalled();
  });

  it("réessaie si la déclaration de la topologie échoue", async () => {
    const broken = fakeModel();
    broken.channel.assertExchange.mockRejectedValue(
      new Error("PRECONDITION_FAILED"),
    );
    const connect = vi.fn().mockResolvedValue(broken.model);
    const connection = new RabbitMqConnection(config, {
      topology: defaultTopology,
      logger,
      connect,
    });

    await connection.start();

    expect(broken.model.close).toHaveBeenCalled();
    expect(connection.status()).toMatchObject({
      state: "disconnected",
      lastError: "PRECONDITION_FAILED",
    });
    await connection.close();
  });

  it("ouvre des channels avec le prefetch configuré, seulement une fois connecté", async () => {
    const { model, channel } = fakeModel();
    const connection = new RabbitMqConnection(config, {
      topology: defaultTopology,
      logger,
      connect: vi.fn().mockResolvedValue(model),
    });

    await expect(connection.createChannel()).rejects.toThrow(
      RabbitMqNotConnectedError,
    );

    await connection.start();
    await connection.createChannel();

    expect(channel.prefetch).toHaveBeenCalledWith(5);
  });

  it("close arrête les tentatives et ferme la connexion sans reconnecter", async () => {
    const { model } = fakeModel();
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValue(model);
    const connection = new RabbitMqConnection(config, {
      topology: defaultTopology,
      logger,
      connect,
      initialReconnectDelayMs: 100,
    });

    await connection.start();
    await connection.close();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(connect).toHaveBeenCalledTimes(1);
    expect(connection.status().state).toBe("closed");
  });

  it("ne reconnecte pas quand la connexion est fermée volontairement", async () => {
    const { model } = fakeModel();
    const connect = vi.fn().mockResolvedValue(model);
    const connection = new RabbitMqConnection(config, {
      topology: defaultTopology,
      logger,
      connect,
    });
    await connection.start();

    await connection.close();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(model.close).toHaveBeenCalledOnce();
    expect(connect).toHaveBeenCalledOnce();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("ouvre des canaux confirm avec le prefetch configuré, seulement une fois connecté", async () => {
    const { model, channel } = fakeModel();
    const connection = new RabbitMqConnection(config, {
      topology: defaultTopology,
      logger,
      connect: vi.fn().mockResolvedValue(model),
    });

    await expect(connection.createConfirmChannel()).rejects.toThrow(
      RabbitMqNotConnectedError,
    );

    await connection.start();
    await connection.createConfirmChannel();

    expect(model.createConfirmChannel).toHaveBeenCalledOnce();
    expect(channel.prefetch).toHaveBeenCalledWith(5);
  });

  it("appelle les hooks onConnected à chaque connexion et journalise leurs erreurs", async () => {
    const first = fakeModel();
    const second = fakeModel();
    const connection = new RabbitMqConnection(config, {
      topology: defaultTopology,
      logger,
      connect: vi
        .fn()
        .mockResolvedValueOnce(first.model)
        .mockResolvedValueOnce(second.model),
      initialReconnectDelayMs: 10,
    });
    const hook = vi.fn().mockRejectedValueOnce(new Error("setup failed"));
    connection.onConnected(hook);

    await connection.start();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Post-connection setup failed: setup failed"),
    );

    first.model.emit("close", new Error("lost"));
    await vi.advanceTimersByTimeAsync(10);

    expect(hook).toHaveBeenCalledTimes(2);
  });
});
