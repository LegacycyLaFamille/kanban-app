import { afterEach, describe, expect, it, vi } from "vitest";

import { act, render, screen } from "@testing-library/react";

import { getUnreadNotificationCount } from "../api/notifications.api";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";

import { UnreadNotificationsProvider } from "./UnreadNotificationsProvider";

vi.mock("../api/notifications.api", () => ({
  getUnreadNotificationCount: vi.fn(),
}));

function CountProbe() {
  const { unreadCount, decrementUnreadCount } = useUnreadNotifications();
  return (
    <button type="button" onClick={decrementUnreadCount}>
      {`count:${unreadCount}`}
    </button>
  );
}

function renderProvider(pollIntervalMs?: number) {
  return render(
    <UnreadNotificationsProvider pollIntervalMs={pollIntervalMs}>
      <CountProbe />
    </UnreadNotificationsProvider>,
  );
}

describe("UnreadNotificationsProvider", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("loads the unread count on mount", async () => {
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(4);

    renderProvider();

    expect(await screen.findByText("count:4")).toBeTruthy();
  });

  it("polls the backend for new notifications", async () => {
    vi.useFakeTimers();
    vi.mocked(getUnreadNotificationCount)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    renderProvider(1000);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("count:1")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText("count:2")).toBeTruthy();
  });

  it("backs off while the backend is unreachable", async () => {
    vi.useFakeTimers();
    vi.mocked(getUnreadNotificationCount).mockRejectedValue(
      new Error("ECONNREFUSED"),
    );

    renderProvider(1000);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(1);

    // First failure doubles the delay: nothing at 1s, next call at 2s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(2);

    // Then 4s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(3);
  });

  it("does not poll while the tab is hidden", async () => {
    vi.useFakeTimers();
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(1);
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden");

    renderProvider(1000);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Only the initial load.
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(1);
    visibility.mockRestore();
  });

  it("keeps the last known count when the request fails", async () => {
    vi.mocked(getUnreadNotificationCount).mockRejectedValue(
      new Error("network down"),
    );

    renderProvider();

    expect(await screen.findByText("count:0")).toBeTruthy();
  });

  it("never decrements below zero", async () => {
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(0);

    renderProvider();

    const button = await screen.findByText("count:0");
    act(() => {
      button.click();
    });

    expect(screen.getByText("count:0")).toBeTruthy();
  });
});
