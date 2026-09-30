import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, setSessionExpiredHandler } from "../../../shared/api";
import * as authApi from "../api/auth.api";
import { useAuth } from "../hooks/useAuth";
import { AuthProvider } from "./AuthProvider";

vi.mock("../api/auth.api");

vi.mock("../../../shared/api", async () => {
  const actual =
    await vi.importActual<typeof import("../../../shared/api")>(
      "../../../shared/api",
    );

  return { ...actual, setSessionExpiredHandler: vi.fn() };
});

function Probe() {
  const { user, isAuthenticated, isInitializing, sessionError, signIn, signOut } =
    useAuth();

  return (
    <div>
      <span data-testid="initializing">{String(isInitializing)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user?.name ?? "none"}</span>
      <span data-testid="error">{sessionError ?? "none"}</span>
      <button onClick={() => void signIn({ email: "a@b.com", password: "pw" })}>
        sign in
      </button>
      <button onClick={() => void signOut()}>sign out</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restores the session on startup when it is valid", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("initializing").textContent).toBe("false");
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("true");
    expect(screen.getByTestId("user").textContent).toBe("Jane Doe");
    expect(screen.getByTestId("error").textContent).toBe("none");
  });

  it("starts unauthenticated with no session, without surfacing an error", async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(
      new ApiError(401, "UNAUTHENTICATED", "Authentication required."),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("initializing").textContent).toBe("false");
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("error").textContent).toBe("none");
  });

  it("surfaces a session error on startup for non-auth failures (e.g. network)", async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error("network down"));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("initializing").textContent).toBe("false");
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("error").textContent).toBe(
      "Unable to verify your session.",
    );
  });

  it("clears auth state when httpClient reports the session expired mid-session", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    // Simulate httpClient's centralized 401 handler firing for a request
    // made from an unrelated feature (e.g. GET /projects), which is how
    // AuthProvider actually learns the backend session died mid-session.
    const registeredHandler = vi.mocked(setSessionExpiredHandler).mock.calls.at(-1)?.[0];

    expect(registeredHandler).toBeInstanceOf(Function);

    act(() => {
      registeredHandler?.();
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("none");
  });

  it("updates the UI reactively across a logout/login transition with no page reload", async () => {
    const user = userEvent.setup();

    vi.mocked(authApi.getCurrentUser)
      .mockResolvedValueOnce({
        id: "user-1",
        name: "Jane Doe",
        email: "jane@example.com",
      })
      .mockResolvedValueOnce({
        id: "user-1",
        name: "Jane Doe",
        email: "jane@example.com",
      });

    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    vi.mocked(authApi.login).mockResolvedValue(undefined);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    await user.click(screen.getByText("sign out"));

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("false");
    });

    await user.click(screen.getByText("sign in"));

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    expect(screen.getByTestId("user").textContent).toBe("Jane Doe");
  });
});
