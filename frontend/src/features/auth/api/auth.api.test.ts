import { afterEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../../../shared/api";

import { getCurrentUser, login, logout, refresh, register } from "./auth.api";

describe("auth.api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls register endpoint", async () => {
    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(undefined);

    const payload = {
      name: "Mathis",
      email: "mathis@example.com",
      password: "password123",
    };

    await register(payload);

    expect(postSpy).toHaveBeenCalledWith("/auth/register", payload, {
      skipAuthRefresh: true,
    });
  });

  it("calls login endpoint", async () => {
    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(undefined);

    const payload = {
      email: "mathis@example.com",
      password: "password123",
    };

    await login(payload);

    expect(postSpy).toHaveBeenCalledWith("/auth/login", payload, {
      skipAuthRefresh: true,
    });
  });

  it("retrieves the current user", async () => {
    const user = {
      id: "user-1",
      name: "Mathis",
      email: "mathis@example.com",
    };

    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue(user);

    const result = await getCurrentUser();

    expect(getSpy).toHaveBeenCalledWith("/auth/me");

    expect(result).toEqual(user);
  });

  it("calls refresh endpoint", async () => {
    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(undefined);

    await refresh();

    expect(postSpy).toHaveBeenCalledWith("/auth/refresh", undefined, {
      skipAuthRefresh: true,
    });
  });

  it("calls logout endpoint", async () => {
    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(undefined);

    await logout();

    expect(postSpy).toHaveBeenCalledWith("/auth/logout", undefined, {
      skipAuthRefresh: true,
    });
  });
});
