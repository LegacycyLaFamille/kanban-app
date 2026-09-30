import amqp from "amqplib";
import type { Channel, ChannelModel, ConfirmChannel } from "amqplib";
import type { RabbitMqConfig } from "../../config/rabbitmq.config.js";
import { declareTopology, type Topology } from "./topology.js";

export type RabbitMqState =
  "disabled" | "connecting" | "connected" | "disconnected" | "closed";

export interface RabbitMqStatus {
  state: RabbitMqState;
  url?: string;
  lastError?: string;
  connectedAt?: string;
  reconnectAttempt?: number;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface RabbitMqConnectionOptions {
  topology: Topology;
  logger?: Logger;
  connect?: (url: string) => Promise<ChannelModel>;
  initialReconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
}

const prefix = "[rabbitmq]";
const consoleLogger: Logger = {
  info: (m) => console.log(`${prefix} ${m}`),
  warn: (m) => console.warn(`${prefix} ${m}`),
  error: (m) => console.error(`${prefix} ${m}`),
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class RabbitMqNotConnectedError extends Error {
  constructor(state: RabbitMqState) {
    super(`RabbitMQ is not connected (state: ${state})`);
  }
}

// Owns the single AMQP connection of the backend. The broker being down never
// crashes the app: connection attempts are retried in the background with
// exponential backoff, every failure is logged, and `status()` exposes the
// current state to the health endpoint. The topology is (re)declared after
// every successful connection.
export class RabbitMqConnection {
  private model: ChannelModel | null = null;
  private timer: NodeJS.Timeout | null = null;
  private attempt = 0;
  private stopped = true;
  private current: RabbitMqStatus;
  private readonly logger: Logger;
  private readonly connect: (url: string) => Promise<ChannelModel>;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly connectedListeners: Array<() => Promise<void> | void> = [];

  constructor(
    private readonly config: RabbitMqConfig | null,
    private readonly options: RabbitMqConnectionOptions,
  ) {
    this.logger = options.logger ?? consoleLogger;
    this.connect = options.connect ?? ((url) => amqp.connect(url));
    this.initialDelay = options.initialReconnectDelayMs ?? 1_000;
    this.maxDelay = options.maxReconnectDelayMs ?? 30_000;
    this.current = config
      ? { state: "closed", url: config.safeUrl }
      : { state: "disabled" };
  }

  status(): RabbitMqStatus {
    return { ...this.current };
  }

  isConnected(): boolean {
    return this.current.state === "connected";
  }

  // Starts connecting in the background and returns once the first attempt
  // has finished, whether it succeeded or not. It never rejects.
  async start(): Promise<void> {
    if (this.config === null) {
      this.logger.warn(
        "RABBITMQ_URL / RABBITMQ_HOST not set: running without a message broker",
      );
      return;
    }
    if (!this.stopped) return;

    this.stopped = false;
    this.logger.info(`Connecting to ${this.config.safeUrl}`);
    await this.tryConnect();
  }

  async createChannel(): Promise<Channel> {
    if (this.model === null || !this.isConnected()) {
      throw new RabbitMqNotConnectedError(this.current.state);
    }
    const channel = await this.model.createChannel();
    await channel.prefetch(this.config?.prefetch ?? 10);
    return channel;
  }

  // Channel whose publishes are acknowledged by the broker.
  async createConfirmChannel(): Promise<ConfirmChannel> {
    if (this.model === null || !this.isConnected()) {
      throw new RabbitMqNotConnectedError(this.current.state);
    }
    return this.model.createConfirmChannel();
  }

  // Runs after every successful (re)connection, once the topology exists.
  // Consumers use it to re-open their channels after a connection loss.
  onConnected(listener: () => Promise<void> | void): void {
    this.connectedListeners.push(listener);
  }

  async close(): Promise<void> {
    if (this.config === null) return;
    this.stopped = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const model = this.model;
    this.model = null;
    this.update({ state: "closed" });
    if (model !== null) {
      await model.close().catch((error: unknown) => {
        this.logger.warn(`Error while closing: ${errorMessage(error)}`);
      });
    }
  }

  private async tryConnect(): Promise<void> {
    if (this.stopped || this.config === null) return;
    this.update({ state: "connecting" });

    let model: ChannelModel | null = null;
    try {
      model = await this.connect(this.config.url);
      const channel = await model.createChannel();
      try {
        await declareTopology(channel, this.options.topology);
      } finally {
        await channel.close();
      }
    } catch (error) {
      if (model !== null) await model.close().catch(() => {});
      this.scheduleReconnect(errorMessage(error));
      return;
    }

    if (this.stopped) {
      await model.close().catch(() => {});
      return;
    }

    this.model = model;
    this.attempt = 0;
    this.bind(model);
    this.update({
      state: "connected",
      connectedAt: new Date().toISOString(),
      reconnectAttempt: 0,
    });
    this.logger.info("Connected, topology declared");

    for (const listener of this.connectedListeners) {
      try {
        await listener();
      } catch (error) {
        this.logger.error(
          `Post-connection setup failed: ${errorMessage(error)}`,
        );
      }
    }
  }

  private bind(model: ChannelModel): void {
    // `error` is always followed by `close`; listening to it only prevents
    // an unhandled 'error' event from crashing the process.
    model.on("error", (error: unknown) => {
      this.logger.error(`Connection error: ${errorMessage(error)}`);
    });
    model.on("close", (error?: unknown) => {
      if (this.model !== model) return;
      this.model = null;
      if (this.stopped) return;

      const reason = error ? errorMessage(error) : "connection closed";
      this.logger.warn(`Connection lost: ${reason}`);
      this.scheduleReconnect(reason);
    });
    model.on("blocked", (reason: string) => {
      this.logger.warn(`Connection blocked by the broker: ${reason}`);
    });
  }

  private scheduleReconnect(reason: string): void {
    if (this.stopped || this.timer !== null) return;

    this.attempt++;
    const delay = Math.min(
      this.maxDelay,
      this.initialDelay * 2 ** (this.attempt - 1),
    );
    this.update({
      state: "disconnected",
      lastError: reason,
      reconnectAttempt: this.attempt,
    });
    this.logger.warn(
      `Broker unavailable (${reason}), retry #${this.attempt} in ${delay}ms`,
    );

    this.timer = setTimeout(() => {
      this.timer = null;
      void this.tryConnect();
    }, delay);
    // Retrying must not keep the process alive on its own.
    this.timer.unref();
  }

  private update(patch: Partial<RabbitMqStatus>): void {
    this.current = { ...this.current, ...patch };
  }
}
