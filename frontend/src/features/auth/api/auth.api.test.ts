import { afterEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../../../shared/api";

import { login, register } from "./auth.api";

describe("auth.api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends login credentials to the login endpoint", async () => {
    const payload = {
      email: "user@example.com",
      password: "password123",
    };

    const response = {
      user: {
        id: "user-1",
        name: "User",
        email: "user@example.com",
      },
    };

    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(response);

    const result = await login(payload);

    expect(postSpy).toHaveBeenCalledWith("/auth/login", payload);

    expect(result).toEqual(response);
  });

  it("sends registration data to the register endpoint", async () => {
    const payload = {
      name: "New User",
      email: "new@example.com",
      password: "password123",
    };

    const response = {
      message: "Account created.",
    };

    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(response);

    const result = await register(payload);

    expect(postSpy).toHaveBeenCalledWith("/auth/register", payload);

    expect(result).toEqual(response);
  });
});
