import { afterEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../../../shared/api";

import { getProfileStats, updateCurrentUser } from "./profile.api";

describe("profile.api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates the current user with a partial payload", async () => {
    const user = {
      id: "user-1",
      name: "New Name",
      email: "jane@example.com",
      createdAt: "2026-09-01T10:00:00.000Z",
    };
    const patchSpy = vi.spyOn(httpClient, "patch").mockResolvedValue(user);

    const result = await updateCurrentUser({ name: "New Name" });

    expect(patchSpy).toHaveBeenCalledWith("/auth/me", { name: "New Name" });
    expect(result).toEqual(user);
  });

  it("retrieves the current user's activity stats", async () => {
    const stats = { projectCount: 2, taskCount: 4, tasksByStatus: { DONE: 1 } };
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue(stats);

    await expect(getProfileStats()).resolves.toEqual(stats);
    expect(getSpy).toHaveBeenCalledWith("/auth/me/stats");
  });
});
