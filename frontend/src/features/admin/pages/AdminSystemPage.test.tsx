import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Reshaped } from "reshaped";

import { getSystemStatus } from "../api/admin.api";
import type { SystemStatus } from "../types/system.types";
import { AdminSystemPage } from "./AdminSystemPage";

vi.mock("../api/admin.api", () => ({
  getSystemStatus: vi.fn(),
}));

const healthy: SystemStatus = {
  checkedAt: "2026-10-02T10:00:00.000Z",
  status: "ok",
  warnings: [],
  application: {
    version: "1.0.0",
    nodeVersion: "v24.9.0",
    environment: "production",
    startedAt: "2026-10-02T08:00:00.000Z",
    uptimeSeconds: 7_500,
    memory: { rssBytes: 150 * 1024 * 1024, heapUsedBytes: 80 * 1024 * 1024 },
  },
  database: { status: "up", latencyMs: 2.4 },
  broker: { state: "connected", connectedAt: "2026-10-02T08:00:01.000Z" },
  queues: [
    {
      name: "notifications.task-events",
      role: "consumer",
      messages: 0,
      consumers: 1,
    },
    {
      name: "kanban.events.dead-letter",
      role: "dead_letter",
      messages: 0,
      consumers: 0,
    },
  ],
  events: {
    since: "2026-10-02T08:00:00.000Z",
    published: { success: 42, failure: 0 },
    consumed: { success: 40, retry: 2, dead_letter: 0, unreadable: 0 },
  },
  activity: {
    users: 12,
    newUsersLast7Days: 3,
    projects: 5,
    tasks: {
      total: 30,
      todo: 10,
      inProgress: 8,
      done: 12,
      overdue: 4,
      createdLast24Hours: 6,
    },
    unreadNotifications: 9,
  },
  recentProblems: [],
  links: { grafanaDashboard: "http://localhost:3001/d/kanban-backend" },
};

function renderPage() {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <AdminSystemPage />
    </Reshaped>,
  );
}

function figure(label: string) {
  return screen.getByText(label, { selector: "dt" }).nextElementSibling
    ?.textContent;
}

describe("AdminSystemPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a healthy system with its services, events and activity", async () => {
    vi.mocked(getSystemStatus).mockResolvedValue(healthy);

    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /All systems operational/,
      }),
    ).toBeTruthy();
    expect(figure("Database")).toContain("Up · 2.4 ms");
    expect(figure("Message broker")).toContain("Connected");
    expect(figure("Running for")).toBe("2 h 5 min");
    expect(figure("Memory")).toBe("150 MB");
    expect(figure("Published")).toBe("42");
    expect(figure("Retried")).toBe("2");
    expect(figure("Overdue tasks")).toBe("4");
    expect(
      screen.getByText("No warning or error since the backend started."),
    ).toBeTruthy();
  });

  it("explains a degraded system and flags the stuck queue in words", async () => {
    vi.mocked(getSystemStatus).mockResolvedValue({
      ...healthy,
      status: "degraded",
      warnings: [
        "3 event(s) failed for good and wait in kanban.events.dead-letter.",
      ],
      queues: [healthy.queues[0]!, { ...healthy.queues[1]!, messages: 3 }],
    });

    renderPage();

    expect(
      await screen.findByRole("heading", { level: 2, name: /Degraded/ }),
    ).toBeTruthy();
    expect(screen.getByText(/3 event\(s\) failed for good/)).toBeTruthy();

    const table = screen.getByRole("table", { name: "Event queues" });
    const deadLetterRow = within(table)
      .getByText("kanban.events.dead-letter")
      .closest("tr")!;
    expect(deadLetterRow.textContent).toContain("Failed for good");
    expect(deadLetterRow.textContent).toContain("3");
  });

  it("lists recent warnings and errors", async () => {
    vi.mocked(getSystemStatus).mockResolvedValue({
      ...healthy,
      recentProblems: [
        {
          time: "2026-10-02T09:59:00.000Z",
          level: "error",
          component: "rabbitmq",
          message: "Connection lost",
        },
      ],
    });

    renderPage();

    expect(await screen.findByText("Connection lost")).toBeTruthy();
    expect(screen.getByText("rabbitmq")).toBeTruthy();
    expect(screen.getByText("Error")).toBeTruthy();
  });

  it("links to Grafana in a new tab, and says so", async () => {
    vi.mocked(getSystemStatus).mockResolvedValue(healthy);

    renderPage();

    // jsdom drops the space before the visually hidden part of the name.
    const link = await screen.findByRole("link", {
      name: /Open the Grafana dashboard ?\(opens in a new tab\)/,
    });
    expect(link.getAttribute("href")).toBe(
      "http://localhost:3001/d/kanban-backend",
    );
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("explains how to link Grafana when it is not configured", async () => {
    vi.mocked(getSystemStatus).mockResolvedValue({
      ...healthy,
      links: { grafanaDashboard: null },
    });

    renderPage();

    expect(
      await screen.findByText(/No Grafana address configured/),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Grafana/ })).toBeNull();
  });

  it("shows an error and recovers on retry", async () => {
    const user = userEvent.setup();
    vi.mocked(getSystemStatus)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue(healthy);

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /All systems operational/,
      }),
    ).toBeTruthy();
  });

  it("lets the admin turn auto-refresh off", async () => {
    const user = userEvent.setup();
    vi.mocked(getSystemStatus).mockResolvedValue(healthy);

    renderPage();
    const toggle = await screen.findByRole("button", {
      name: "Auto-refresh every 15 s",
    });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    await user.click(toggle);

    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });
});
