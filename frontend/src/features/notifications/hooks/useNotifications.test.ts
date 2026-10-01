import { afterEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@testing-library/react";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications.api";
import type { AppNotification } from "../types/notification.types";

import { NOTIFICATIONS_PAGE_SIZE, useNotifications } from "./useNotifications";

vi.mock("../api/notifications.api", () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

function makeNotification(id: string, readAt: string | null = null) {
  return {
    id,
    type: "task.created",
    readAt,
    createdAt: "2026-10-01T10:00:00.000Z",
    project: { id: "project-1", name: "Marketing Site" },
    task: { id: `task-${id}`, title: `Task ${id}` },
    actor: { id: "user-2", name: "Jane Doe" },
  } satisfies AppNotification;
}

describe("useNotifications", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads the first page of notifications", async () => {
    const items = [makeNotification("1"), makeNotification("2")];
    vi.mocked(getNotifications).mockResolvedValue({ items, nextCursor: null });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getNotifications).toHaveBeenCalledWith({
      unread: false,
      limit: NOTIFICATIONS_PAGE_SIZE,
    });
    expect(result.current.notifications).toEqual(items);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("requests only unread notifications with the unread filter", async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    const { result } = renderHook(() => useNotifications("unread"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getNotifications).toHaveBeenCalledWith({
      unread: true,
      limit: NOTIFICATIONS_PAGE_SIZE,
    });
  });

  it("appends the next page using the cursor", async () => {
    vi.mocked(getNotifications)
      .mockResolvedValueOnce({
        items: [makeNotification("1")],
        nextCursor: "1",
      })
      .mockResolvedValueOnce({
        items: [makeNotification("2")],
        nextCursor: null,
      });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(getNotifications).toHaveBeenLastCalledWith({
      unread: false,
      limit: NOTIFICATIONS_PAGE_SIZE,
      cursor: "1",
    });
    expect(result.current.notifications.map((n) => n.id)).toEqual(["1", "2"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("marks a single notification as read", async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      items: [makeNotification("1")],
      nextCursor: null,
    });
    const read = makeNotification("1", "2026-10-01T11:00:00.000Z");
    vi.mocked(markNotificationRead).mockResolvedValue(read);

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.markRead("1");
    });

    expect(markNotificationRead).toHaveBeenCalledWith("1");
    expect(result.current.notifications[0]).toEqual(read);
  });

  it("does not call the API for an already read notification", async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      items: [makeNotification("1", "2026-10-01T11:00:00.000Z")],
      nextCursor: null,
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.markRead("1");
    });

    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it("marks every notification as read", async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      items: [makeNotification("1"), makeNotification("2")],
      nextCursor: null,
    });
    vi.mocked(markAllNotificationsRead).mockResolvedValue(2);

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
    expect(result.current.notifications.every((n) => n.readAt)).toBe(true);
  });

  it("surfaces an error message when loading fails", async () => {
    vi.mocked(getNotifications).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(
      "Unable to load your notifications. Please try again.",
    );
  });
});
