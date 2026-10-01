import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Reshaped } from "reshaped";

import { useAuth } from "../../auth/hooks/useAuth";
import { useLogin } from "../../auth/hooks/useLogin";
import { useRegister } from "../../auth/hooks/useRegister";

import { LandingPage } from "./LandingPage";

vi.mock("../../auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../auth/hooks/useLogin", () => ({
  useLogin: vi.fn(),
}));

vi.mock("../../auth/hooks/useRegister", () => ({
  useRegister: vi.fn(),
}));

const signIn = vi.fn();
const register = vi.fn();

function mockAuth(isAuthenticated: boolean) {
  vi.mocked(useAuth).mockReturnValue({
    user: isAuthenticated
      ? { id: "user-1", name: "Ada", email: "ada@example.com" }
      : null,
    isAuthenticated,
    isInitializing: false,
    sessionError: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshUser: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

function renderPage() {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/projects" element={<div>Projects target</div>} />
        </Routes>
      </MemoryRouter>
    </Reshaped>,
  );
}

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(false);
    vi.mocked(useLogin).mockReturnValue({
      submit: signIn,
      isSubmitting: false,
      error: null,
    });
    vi.mocked(useRegister).mockReturnValue({
      submit: register,
      isSubmitting: false,
      error: null,
    });
  });

  it("presents the product with a single h1 and its sections", () => {
    renderPage();

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toMatch(/Plan it\. Move it\. Ship it\./);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /Everything a team needs/,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: /Three steps/ }),
    ).toBeTruthy();
  });

  it("opens on the Create account tab, and switches tabs with the arrow keys", async () => {
    const user = userEvent.setup();
    renderPage();

    const createTab = screen.getByRole("tab", { name: "Create account" });
    expect(createTab.getAttribute("aria-selected")).toBe("true");
    expect(
      within(screen.getByRole("tabpanel")).getByLabelText("Confirm password"),
    ).toBeTruthy();

    createTab.focus();
    await user.keyboard("{ArrowLeft}");

    const signInTab = screen.getByRole("tab", { name: "Sign in" });
    expect(signInTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(signInTab);
    // Only the active panel is exposed: the sign-up form is hidden.
    expect(
      within(screen.getByRole("tabpanel")).queryByLabelText("Confirm password"),
    ).toBeNull();
  });

  it("selects the Sign in tab from the header button", async () => {
    const user = userEvent.setup();
    renderPage();

    const header = screen.getByRole("banner");
    await user.click(within(header).getByRole("button", { name: "Sign in" }));

    expect(
      screen
        .getByRole("tab", { name: "Sign in" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("creates an account, then invites the user to sign in", async () => {
    const user = userEvent.setup();
    register.mockResolvedValue(true);
    renderPage();

    const panel = screen.getByRole("tabpanel");
    await user.type(within(panel).getByLabelText("Name"), "Ada");
    await user.type(within(panel).getByLabelText("Email"), "ada@example.com");
    await user.type(within(panel).getByLabelText("Password"), "password123");
    await user.type(
      within(panel).getByLabelText("Confirm password"),
      "password123",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Create account" }),
    );

    expect(register).toHaveBeenCalledWith({
      name: "Ada",
      email: "ada@example.com",
      password: "password123",
    });
    expect(
      await screen.findByText(/Your account has been created/),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("tab", { name: "Sign in" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  }, 15_000);

  it("signs in and opens the projects", async () => {
    const user = userEvent.setup();
    signIn.mockResolvedValue(true);
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Sign in" }));
    const panel = screen.getByRole("tabpanel");
    await user.type(within(panel).getByLabelText("Email"), "ada@example.com");
    await user.type(within(panel).getByLabelText("Password"), "password123");
    await user.click(within(panel).getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Projects target")).toBeTruthy();
    });
    expect(signIn).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "password123",
    });
  }, 15_000);

  it("offers the workspace instead of the forms to a signed-in user", () => {
    mockAuth(true);
    renderPage();

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByText(/Signed in as Ada/)).toBeTruthy();
    expect(
      screen
        .getAllByRole("link", { name: /Open my workspace/ })[0]
        .getAttribute("href"),
    ).toBe("/projects");
  });

  it("lets the user pause the animations", async () => {
    const user = userEvent.setup();
    renderPage();

    const toggle = screen.getByRole("button", { name: "Pause animations" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await user.click(toggle);

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });
});
