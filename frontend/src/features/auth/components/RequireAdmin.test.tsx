import { describe, expect, it, vi, beforeEach } from "vitest";

import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import type { AuthContextValue } from "../context/AuthContext";
import { useAuth } from "../hooks/useAuth";

import { RequireAdmin } from "./RequireAdmin";

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

function renderWithGuard() {
  const router = createMemoryRouter(
    [
      {
        element: <RequireAdmin />,
        children: [
          { path: "/admin/tasks", element: <div>Admin dashboard</div> },
        ],
      },
      { path: "/projects", element: <div>Projects page</div> },
    ],
    { initialEntries: ["/admin/tasks"] },
  );

  render(<RouterProvider router={router} />);

  return router;
}

describe("RequireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state while the session is initializing", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitializing: true,
      sessionError: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    } satisfies AuthContextValue);

    renderWithGuard();

    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("redirects a non-admin user to /projects", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "user-1",
        name: "Regular User",
        email: "user@example.com",
        role: "USER",
      },
      isAuthenticated: true,
      isInitializing: false,
      sessionError: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    } satisfies AuthContextValue);

    const router = renderWithGuard();

    expect(screen.getByText("Projects page")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/projects");
  });

  it("renders the admin route for an admin user", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "user-1",
        name: "Admin User",
        email: "admin@example.com",
        role: "ADMIN",
      },
      isAuthenticated: true,
      isInitializing: false,
      sessionError: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    } satisfies AuthContextValue);

    renderWithGuard();

    expect(screen.getByText("Admin dashboard")).toBeTruthy();
  });
});
