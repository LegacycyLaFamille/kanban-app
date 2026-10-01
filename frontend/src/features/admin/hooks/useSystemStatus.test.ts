import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook } from "@testing-library/react";

import { getSystemStatus } from "../api/admin.api";
import type { SystemStatus } from "../types/system.types";
import { useSystemStatus } from "./useSystemStatus";

vi.mock("../api/admin.api", () => ({
  getSystemStatus: vi.fn(),
}));

const status = { status: "ok" } as SystemStatus;

describe("useSystemStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getSystemStatus).mockResolvedValue(status);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("refreshes on its own while auto-refresh is on", async () => {
    const { result } = renderHook(() => useSystemStatus(1_000));
    await act(async () => {});
    expect(result.current.status).toBe(status);
    expect(getSystemStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(getSystemStatus).toHaveBeenCalledTimes(4);
  });

  it("stops refreshing when auto-refresh is turned off", async () => {
    const { result } = renderHook(() => useSystemStatus(1_000));
    await act(async () => {});

    act(() => result.current.setAutoRefresh(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(getSystemStatus).toHaveBeenCalledTimes(1);
  });

  it("keeps the last status when a refresh fails", async () => {
    const { result } = renderHook(() => useSystemStatus(1_000));
    await act(async () => {});
    vi.mocked(getSystemStatus).mockRejectedValue(new Error("network down"));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe(status);
    expect(result.current.error).toBeTruthy();
  });
});
