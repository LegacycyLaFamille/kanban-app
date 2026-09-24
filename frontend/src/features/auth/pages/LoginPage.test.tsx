import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { MemoryRouter, Route, Routes } from "react-router-dom";

import { Reshaped } from "reshaped";

import { useLogin } from "../hooks/useLogin";

import { LoginPage } from "./LoginPage";

vi.mock("../hooks/useLogin", () => ({
  useLogin: vi.fn(),
}));

describe("LoginPage", () => {
  const submit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useLogin).mockReturnValue({
      submit,
      isSubmitting: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <Reshaped theme="slate" defaultColorMode="dark">
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/projects" element={<div>Projects target</div>} />

            <Route path="/register" element={<div>Register target</div>} />
          </Routes>
        </MemoryRouter>
      </Reshaped>,
    );
  }

  it("submits valid credentials and redirects to projects", async () => {
    const user = userEvent.setup();

    submit.mockResolvedValue(true);

    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");

    await user.type(screen.getByLabelText("Password"), "password123");

    await user.click(
      screen.getByRole("button", {
        name: "Sign in",
      }),
    );

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });

    expect(await screen.findByText("Projects target")).toBeTruthy();
  });

  it("does not call the login hook when email is invalid", async () => {
    const user = userEvent.setup();

    renderPage();

    await user.type(screen.getByLabelText("Email"), "invalid-email");

    await user.type(screen.getByLabelText("Password"), "password123");

    await user.click(
      screen.getByRole("button", {
        name: "Sign in",
      }),
    );

    expect(submit).not.toHaveBeenCalled();

    expect(
      screen.getByText("Please enter a valid email address."),
    ).toBeTruthy();
  });

  it("does not redirect when login fails", async () => {
    const user = userEvent.setup();

    submit.mockResolvedValue(false);

    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");

    await user.type(screen.getByLabelText("Password"), "wrong-password");

    await user.click(
      screen.getByRole("button", {
        name: "Sign in",
      }),
    );

    await waitFor(() => {
      expect(submit).toHaveBeenCalled();
    });

    expect(screen.queryByText("Projects target")).toBeNull();
  });

  it("displays authentication errors", () => {
    vi.mocked(useLogin).mockReturnValue({
      submit,
      isSubmitting: false,
      error: "Invalid credentials.",
    });

    renderPage();

    expect(screen.getByRole("alert").textContent).toContain(
      "Invalid credentials.",
    );
  });
});
