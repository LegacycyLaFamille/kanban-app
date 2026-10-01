import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { Reshaped } from "reshaped";

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications.api";
import { UnreadNotificationsProvider } from "../context/UnreadNotificationsProvider";
import type { AppNotification } from "../types/notification.types";

import { NotificationsPage } from "./NotificationsPage";

vi.mock("../api/notifications.api", () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="current-path">{location.pathname}</div>;
}

function renderPage() {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <MemoryRouter initialEntries={["/notifications"]}>
        <UnreadNotificationsProvider>
          <NotificationsPage />
          <LocationProbe />
        </UnreadNotificationsProvider>
      </MemoryRouter>
    </Reshaped>,
  );
}

const unread: AppNotification = {
  id: "notif-1",
  type: "task.created",
  readAt: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  project: { id: "project-1", name: "Marketing Site" },
  task: { id: "task-1", title: "Write copy" },
  actor: { id: "user-2", name: "Jane Doe" },
};

const read: AppNotification = {
  id: "notif-2",
  type: "task.completed",
  readAt: "2026-10-01T09:00:00.000Z",
  createdAt: "2026-09-30T10:00:00.000Z",
  project: { id: "project-2", name: "Mobile App" },
  task: { id: "task-2", title: "Fix crash" },
  actor: { id: "user-3", name: "John Smith" },
};

describe("NotificationsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the current user's notifications", async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      items: [unread, read],
      nextCursor: null,
    });
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(1);

    renderPage();

    expect(
      await screen.findByText('Jane Doe created "Write copy"'),
    ).toBeTruthy();
    expect(screen.getByText('John Smith completed "Fix crash"')).toBeTruthy();
    expect(screen.getAllByText("New")).toHaveLength(1);
    expect(await screen.findByText("Unread (1)")).toBeTruthy();
  });

  it("shows an empty state when there are no notifications", async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(0);

    renderPage();

    expect(await screen.findByText("No notifications yet")).toBeTruthy();
  });

  it("switches to the unread filter", async () => {
    const user = userEvent.setup();
    vi.mocked(getNotifications).mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(0);

    renderPage();

    await screen.findByText("No notifications yet");
    await user.click(screen.getByRole("button", { name: "Unread" }));

    expect(await screen.findByText("You're all caught up")).toBeTruthy();
    expect(getNotifications).toHaveBeenLastCalledWith({
      unread: true,
      limit: 20,
    });
  });

  it("marks a notification as read and opens its project Kanban", async () => {
    const user = userEvent.setup();
    vi.mocked(getNotifications).mockResolvedValue({
      items: [unread],
      nextCursor: null,
    });
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(1);
    vi.mocked(markNotificationRead).mockResolvedValue({
      ...unread,
      readAt: "2026-10-01T11:00:00.000Z",
    });

    renderPage();

    await user.click(
      await screen.findByRole("button", {
        name: /Jane Doe created "Write copy"/,
      }),
    );

    expect(markNotificationRead).toHaveBeenCalledWith("notif-1");
    expect(screen.getByTestId("current-path").textContent).toBe(
      "/projects/project-1/kanban",
    );
  });

  it("marks all notifications as read", async () => {
    const user = userEvent.setup();
    vi.mocked(getNotifications).mockResolvedValue({
      items: [unread],
      nextCursor: null,
    });
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(1);
    vi.mocked(markAllNotificationsRead).mockResolvedValue(1);

    renderPage();

    await screen.findByText("Unread (1)");
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));

    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText("New")).toBeNull();
    });
    expect(screen.getByRole("button", { name: "Unread" })).toBeTruthy();
  });

  it("shows an error state with a retry action when loading fails", async () => {
    const user = userEvent.setup();
    vi.mocked(getNotifications)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ items: [unread], nextCursor: null });
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(1);

    renderPage();

    expect(
      await screen.findByText(
        "Unable to load your notifications. Please try again.",
      ),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByText('Jane Doe created "Write copy"'),
    ).toBeTruthy();
  });
});
