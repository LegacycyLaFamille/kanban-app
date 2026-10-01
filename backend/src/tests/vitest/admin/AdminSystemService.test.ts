import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AdminSystemService,
  type AdminSystemDependencies,
} from "../../../modules/admin/AdminSystemService.js";
import type { AdminStats } from "../../../modules/admin/AdminStatsRepository.js";

const now = new Date("2026-10-02T10:00:00.000Z");

const stats: AdminStats = {
  users: 3,
  newUsersLast7Days: 1,
  projects: 2,
  tasks: {
    total: 5,
    todo: 2,
    inProgress: 1,
    done: 2,
    overdue: 1,
    createdLast24Hours: 4,
  },
  unreadNotifications: 6,
};

describe("AdminSystemService", () => {
  let deps: AdminSystemDependencies;
  let queues: Record<string, { messages: number; consumers: number } | null>;

  beforeEach(() => {
    queues = {
      "notifications.task-events": { messages: 0, consumers: 1 },
      "notifications.task-events.retry": { messages: 2, consumers: 0 },
      "kanban.events.dead-letter": { messages: 0, consumers: 0 },
    };
    deps = {
      checkDatabase: vi.fn().mockResolvedValue(undefined),
      brokerStatus: vi.fn().mockReturnValue({
        state: "connected",
        connectedAt: "2026-10-02T09:00:00.000Z",
        url: "amqp://user:secret@rabbitmq",
        lastError: "internal detail",
      }),
      inspectQueue: vi.fn(async (name: string) => queues[name] ?? null),
      queues: [
        { name: "notifications.task-events", role: "consumer" },
        { name: "notifications.task-events.retry", role: "retry" },
        { name: "kanban.events.dead-letter", role: "dead_letter" },
      ],
      statsRepository: { stats: vi.fn().mockResolvedValue(stats) },
      eventTotals: () => ({
        since: "2026-10-02T09:00:00.000Z",
        published: { success: 10, failure: 0 },
        consumed: { success: 9, retry: 1, dead_letter: 0, unreadable: 0 },
      }),
      recentProblems: () => [],
      application: {
        version: "1.0.0",
        environment: "test",
        startedAt: new Date("2026-10-02T09:00:00.000Z"),
      },
      grafanaUrl: "http://localhost:3001/",
      now: () => now,
    };
  });

  it("reports a healthy system", async () => {
    const status = await new AdminSystemService(deps).status();

    expect(status.status).toBe("ok");
    expect(status.warnings).toEqual([]);
    expect(status.database.status).toBe("up");
    expect(status.queues).toEqual([
      {
        name: "notifications.task-events",
        role: "consumer",
        messages: 0,
        consumers: 1,
      },
      {
        name: "notifications.task-events.retry",
        role: "retry",
        messages: 2,
        consumers: 0,
      },
      {
        name: "kanban.events.dead-letter",
        role: "dead_letter",
        messages: 0,
        consumers: 0,
      },
    ]);
    expect(status.activity).toEqual(stats);
    expect(status.application.uptimeSeconds).toBe(3600);
    expect(status.links.grafanaDashboard).toBe(
      "http://localhost:3001/d/kanban-backend",
    );
  });

  it("never exposes the broker URL or raw errors", async () => {
    const status = await new AdminSystemService(deps).status();

    expect(status.broker).toEqual({
      state: "connected",
      connectedAt: "2026-10-02T09:00:00.000Z",
    });
    expect(JSON.stringify(status)).not.toContain("secret");
  });

  it("is degraded when events are dead-lettered", async () => {
    queues["kanban.events.dead-letter"] = { messages: 3, consumers: 0 };

    const status = await new AdminSystemService(deps).status();

    expect(status.status).toBe("degraded");
    expect(status.warnings).toEqual([
      "3 event(s) failed for good and wait in kanban.events.dead-letter.",
    ]);
  });

  it("is degraded when nobody consumes the notification queue", async () => {
    queues["notifications.task-events"] = { messages: 7, consumers: 0 };

    const status = await new AdminSystemService(deps).status();

    expect(status.status).toBe("degraded");
    expect(status.warnings).toEqual([
      "No consumer is listening on notifications.task-events.",
    ]);
  });

  it("does not query queues while the broker is disconnected", async () => {
    deps.brokerStatus = vi.fn().mockReturnValue({
      state: "disconnected",
      reconnectAttempt: 4,
    });

    const status = await new AdminSystemService(deps).status();

    expect(deps.inspectQueue).not.toHaveBeenCalled();
    expect(status.queues.every((q) => q.messages === null)).toBe(true);
    expect(status.status).toBe("degraded");
    expect(status.warnings[0]).toMatch(/broker is disconnected/);
  });

  it("is down without a database, and skips the activity counts", async () => {
    deps.checkDatabase = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const status = await new AdminSystemService(deps).status();

    expect(status.status).toBe("down");
    expect(status.database).toEqual({ status: "down", latencyMs: null });
    expect(status.activity).toBeNull();
    expect(deps.statsRepository.stats).not.toHaveBeenCalled();
  });

  it("warns when no broker is configured", async () => {
    deps.brokerStatus = vi.fn().mockReturnValue({ state: "disabled" });

    const status = await new AdminSystemService(deps).status();

    expect(status.status).toBe("degraded");
    expect(status.warnings).toEqual([
      "No message broker is configured: notifications are not sent.",
    ]);
  });

  it("has no Grafana link when GRAFANA_URL is not set", async () => {
    deps.grafanaUrl = null;

    const status = await new AdminSystemService(deps).status();

    expect(status.links.grafanaDashboard).toBeNull();
  });

  it("still answers when a queue check fails", async () => {
    deps.inspectQueue = vi.fn().mockRejectedValue(new Error("channel closed"));

    const status = await new AdminSystemService(deps).status();

    expect(status.queues.every((q) => q.messages === null)).toBe(true);
  });
});
