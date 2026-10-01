import { afterEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../../../shared/api";
import type { AppNotification } from "../types/notification.types";

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications.api";

const notification: AppNotification = {
  id: "notif-1",
  type: "task.created",
  readAt: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  project: { id: "project-1", name: "Marketing Site" },
  task: { id: "task-1", title: "Write copy" },
  actor: { id: "user-2", name: "Jane Doe" },
};

describe("notifications.api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the first page of notifications without query parameters", async () => {
    const page = { items: [notification], nextCursor: null };
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue(page);

    const result = await getNotifications();

    expect(getSpy).toHaveBeenCalledWith("/notifications");
    expect(result).toEqual(page);
  });

  it("forwards the unread filter, limit and cursor as query parameters", async () => {
    const getSpy = vi
      .spyOn(httpClient, "get")
      .mockResolvedValue({ items: [], nextCursor: null });

    await getNotifications({ unread: true, limit: 10, cursor: "notif-9" });

    expect(getSpy).toHaveBeenCalledWith(
      "/notifications?unread=true&limit=10&cursor=notif-9",
    );
  });

  it("returns the unread notification count", async () => {
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue({ count: 3 });

    const result = await getUnreadNotificationCount();

    expect(getSpy).toHaveBeenCalledWith("/notifications/unread-count");
    expect(result).toBe(3);
  });

  it("marks a single notification as read", async () => {
    const read = { ...notification, readAt: "2026-10-01T11:00:00.000Z" };
    const patchSpy = vi.spyOn(httpClient, "patch").mockResolvedValue(read);

    const result = await markNotificationRead("notif-1");

    expect(patchSpy).toHaveBeenCalledWith("/notifications/notif-1/read");
    expect(result).toEqual(read);
  });

  it("marks every notification as read and returns how many changed", async () => {
    const postSpy = vi
      .spyOn(httpClient, "post")
      .mockResolvedValue({ updated: 4 });

    const result = await markAllNotificationsRead();

    expect(postSpy).toHaveBeenCalledWith("/notifications/read-all");
    expect(result).toBe(4);
  });
});
