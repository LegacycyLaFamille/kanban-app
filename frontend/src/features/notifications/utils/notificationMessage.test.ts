import { describe, expect, it } from "vitest";

import type { AppNotification } from "../types/notification.types";

import {
  formatRelativeTime,
  notificationMessage,
  notificationTarget,
} from "./notificationMessage";

const base: AppNotification = {
  id: "notif-1",
  type: "task.created",
  readAt: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  project: { id: "project-1", name: "Marketing Site" },
  task: { id: "task-1", title: "Write copy" },
  actor: { id: "user-2", name: "Jane Doe" },
};

describe("notificationMessage", () => {
  it("describes a created task", () => {
    expect(notificationMessage(base)).toBe('Jane Doe created "Write copy"');
  });

  it("describes a completed task", () => {
    expect(notificationMessage({ ...base, type: "task.completed" })).toBe(
      'Jane Doe completed "Write copy"',
    );
  });

  it("tells the user they were assigned", () => {
    expect(notificationMessage({ ...base, type: "task.assigned" })).toBe(
      'Jane Doe assigned you to "Write copy"',
    );
  });

  it("lists the fields changed on an assigned task", () => {
    expect(
      notificationMessage({
        ...base,
        type: "task.updated",
        changes: ["status"],
      }),
    ).toBe('Jane Doe changed the status of "Write copy"');
    expect(
      notificationMessage({
        ...base,
        type: "task.updated",
        changes: ["title", "priority", "deadline"],
      }),
    ).toBe('Jane Doe changed the title, priority and deadline of "Write copy"');
  });

  it("falls back to a generic update without the changed fields", () => {
    expect(notificationMessage({ ...base, type: "task.updated" })).toBe(
      'Jane Doe updated "Write copy"',
    );
  });

  it("falls back when the actor or task title is unknown", () => {
    expect(
      notificationMessage({
        ...base,
        actor: null,
        task: { id: "task-1", title: null },
      }),
    ).toBe("Someone created a task");
  });
});

describe("notificationTarget", () => {
  it("opens the project Kanban for a task notification", () => {
    expect(notificationTarget(base)).toBe("/projects/project-1/kanban");
  });

  it("opens the project page when there is no task", () => {
    expect(notificationTarget({ ...base, task: null })).toBe(
      "/projects/project-1",
    );
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-10-01T12:00:00.000Z");

  it("formats recent dates relatively", () => {
    expect(formatRelativeTime("2026-10-01T11:59:30.000Z", now)).toBe(
      "just now",
    );
    expect(formatRelativeTime("2026-10-01T11:45:00.000Z", now)).toBe(
      "15 min ago",
    );
    expect(formatRelativeTime("2026-10-01T09:00:00.000Z", now)).toBe("3 h ago");
    expect(formatRelativeTime("2026-09-30T10:00:00.000Z", now)).toBe(
      "yesterday",
    );
    expect(formatRelativeTime("2026-09-28T10:00:00.000Z", now)).toBe(
      "3 days ago",
    );
  });
});
