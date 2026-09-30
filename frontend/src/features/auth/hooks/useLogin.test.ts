import { act, renderHook } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../../shared/api";

import { useAuth } from "./useAuth";
import { useLogin } from "./useLogin";

vi.mock("./useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("useLogin", () => {
  const signIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      sessionError: null,

      signIn,
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it("returns true when login succeeds", async () => {
    signIn.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogin());

    let success = false;

    await act(async () => {
      success = await result.current.submit({
        email: "mathis@example.com",
        password: "password123",
      });
    });

    expect(success).toBe(true);

    expect(signIn).toHaveBeenCalledWith({
      email: "mathis@example.com",
      password: "password123",
    });

    expect(result.current.error).toBeNull();

    expect(result.current.isSubmitting).toBe(false);
  });

  it("exposes backend authentication errors", async () => {
    signIn.mockRejectedValue(
      new ApiError(401, "INVALID_CREDENTIALS", "Invalid credentials."),
    );

    const { result } = renderHook(() => useLogin());

    let success = true;

    await act(async () => {
      success = await result.current.submit({
        email: "mathis@example.com",
        password: "wrong-password",
      });
    });

    expect(success).toBe(false);

    expect(result.current.error).toBe("Invalid credentials.");
  });
});
