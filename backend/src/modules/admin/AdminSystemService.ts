import type { RabbitMqStatus } from "../../shared/events/rabbitmq/RabbitMqConnection.js";
import type { EventTotals } from "../../shared/observability/eventMetrics.js";
import type { RecentLogEntry } from "../../shared/observability/logger.js";
import type {
  AdminStats,
  AdminStatsRepository,
} from "./AdminStatsRepository.js";

export type QueueRole = "consumer" | "retry" | "dead_letter";

export interface QueueStatus {
  name: string;
  role: QueueRole;
  // null when the broker is unreachable or the queue does not exist.
  messages: number | null;
  consumers: number | null;
}

export interface SystemStatus {
  checkedAt: string;
  status: "ok" | "degraded" | "down";
  // Human-readable reasons behind a non-"ok" status.
  warnings: string[];
  application: {
    version: string;
    nodeVersion: string;
    environment: string;
    startedAt: string;
    uptimeSeconds: number;
    memory: { rssBytes: number; heapUsedBytes: number };
  };
  database: { status: "up" | "down"; latencyMs: number | null };
  broker: Pick<RabbitMqStatus, "state" | "connectedAt" | "reconnectAttempt">;
  queues: QueueStatus[];
  events: EventTotals;
  activity: AdminStats | null;
  recentProblems: RecentLogEntry[];
  links: { grafanaDashboard: string | null };
}

export interface AdminSystemDependencies {
  checkDatabase: () => Promise<void>;
  brokerStatus: () => RabbitMqStatus;
  inspectQueue: (
    name: string,
  ) => Promise<{ messages: number; consumers: number } | null>;
  queues: { name: string; role: QueueRole }[];
  statsRepository: AdminStatsRepository;
  eventTotals: () => EventTotals;
  recentProblems: () => RecentLogEntry[];
  application: { version: string; environment: string; startedAt: Date };
  grafanaUrl: string | null;
  now?: () => Date;
}

const GRAFANA_DASHBOARD_UID = "kanban-backend";

/**
 * What an admin needs to know about the running system, from the backend
 * itself: dependencies, event queues, activity and recent problems. The
 * full history (metrics, logs, traces) stays in Grafana.
 */
export class AdminSystemService {
  constructor(private readonly deps: AdminSystemDependencies) {}

  async status(): Promise<SystemStatus> {
    const now = this.deps.now?.() ?? new Date();

    const database = await this.checkDatabase();
    const { state, connectedAt, reconnectAttempt } = this.deps.brokerStatus();
    const broker = {
      state,
      ...(connectedAt !== undefined && { connectedAt }),
      ...(reconnectAttempt !== undefined && { reconnectAttempt }),
    };

    const queues = await Promise.all(
      this.deps.queues.map(async ({ name, role }) => {
        const inspected =
          state === "connected"
            ? await this.deps.inspectQueue(name).catch(() => null)
            : null;
        return {
          name,
          role,
          messages: inspected?.messages ?? null,
          consumers: inspected?.consumers ?? null,
        };
      }),
    );

    const activity =
      database.status === "up"
        ? await this.deps.statsRepository.stats(now).catch(() => null)
        : null;

    const warnings = this.warnings(database.status, state, queues);
    const status =
      database.status === "down" ? "down" : warnings.length ? "degraded" : "ok";

    const memory = process.memoryUsage();
    const { version, environment, startedAt } = this.deps.application;

    return {
      checkedAt: now.toISOString(),
      status,
      warnings,
      application: {
        version,
        nodeVersion: process.version,
        environment,
        startedAt: startedAt.toISOString(),
        uptimeSeconds: Math.round((now.getTime() - startedAt.getTime()) / 1000),
        memory: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed },
      },
      database,
      broker,
      queues,
      events: this.deps.eventTotals(),
      activity,
      recentProblems: this.deps.recentProblems(),
      links: {
        grafanaDashboard: this.deps.grafanaUrl
          ? `${this.deps.grafanaUrl.replace(/\/+$/, "")}/d/${GRAFANA_DASHBOARD_UID}`
          : null,
      },
    };
  }

  private async checkDatabase(): Promise<SystemStatus["database"]> {
    const started = performance.now();
    try {
      await this.deps.checkDatabase();
      return {
        status: "up",
        latencyMs: Math.round((performance.now() - started) * 10) / 10,
      };
    } catch {
      return { status: "down", latencyMs: null };
    }
  }

  private warnings(
    database: "up" | "down",
    brokerState: RabbitMqStatus["state"],
    queues: QueueStatus[],
  ): string[] {
    const warnings: string[] = [];
    if (database === "down") warnings.push("The database is unreachable.");

    if (brokerState === "disabled") {
      warnings.push(
        "No message broker is configured: notifications are not sent.",
      );
    } else if (brokerState !== "connected") {
      warnings.push(
        `The message broker is ${brokerState}: notifications are delayed until it is back.`,
      );
    }

    for (const queue of queues) {
      if (queue.role === "consumer" && queue.consumers === 0) {
        warnings.push(`No consumer is listening on ${queue.name}.`);
      }
      if (queue.role === "dead_letter" && (queue.messages ?? 0) > 0) {
        warnings.push(
          `${queue.messages} event(s) failed for good and wait in ${queue.name}.`,
        );
      }
    }
    return warnings;
  }
}
