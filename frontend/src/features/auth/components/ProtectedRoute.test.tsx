import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { Reshaped } from "reshaped";

import { MemoryRouter, Route, Routes } from "react-router-dom";

import type { AuthContextValue } from "../context/AuthContext";
import { useAuth } from "../hooks/useAuth";

import { ProtectedRoute } from "./ProtectedRoute";

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("ProtectedRoute", () => {
  const refreshUser = vi.fn();

  function mockAuth(overrides: Partial<AuthContextValue>) {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      sessionError: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUser,
      ...overrides,
    });
  }

  function renderRoute() {
    return render(
      <Reshaped theme="slate" defaultColorMode="dark">
        <MemoryRouter initialEntries={["/projects"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/projects" element={<div>Projects target</div>} />
            </Route>

            <Route path="/login" element={<div>Login target</div>} />
          </Routes>
        </MemoryRouter>
      </Reshaped>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state while the session is being restored", () => {
    mockAuth({ isInitializing: true });

    renderRoute();

    expect(
      screen.getByRole("status", { name: "Loading your session" }),
    ).toBeTruthy();
  });

  it("offers a retry when the session cannot be verified", async () => {
    const user = userEvent.setup();

    mockAuth({ sessionError: "Unable to verify your session." });
    refreshUser.mockResolvedValue(undefined);

    renderRoute();

    expect(screen.getByRole("alert").textContent).toContain(
      "Unable to verify your session",
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(refreshUser).toHaveBeenCalledTimes(1);
    });
  });

  it("redirects unauthenticated users to the login page", () => {
    mockAuth({});

    renderRoute();

    expect(screen.getByText("Login target")).toBeTruthy();
  });

  it("renders the protected page for authenticated users", () => {
    mockAuth({
      isAuthenticated: true,
      user: { id: "user-1", name: "Jane Doe", email: "jane@example.com" },
    });

    renderRoute();

    expect(screen.getByText("Projects target")).toBeTruthy();
  });
});
