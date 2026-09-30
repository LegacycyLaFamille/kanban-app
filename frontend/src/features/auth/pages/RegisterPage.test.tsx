import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { MemoryRouter, Route, Routes } from "react-router-dom";

import { Reshaped } from "reshaped";

import { useRegister } from "../hooks/useRegister";

import { RegisterPage } from "./RegisterPage";

vi.mock("../hooks/useRegister", () => ({
  useRegister: vi.fn(),
}));

describe("RegisterPage", () => {
  const submit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRegister).mockReturnValue({
      submit,
      isSubmitting: false,
      error: null,
    });
  });

  function renderPage() {
    return render(
      <Reshaped theme="slate" defaultColorMode="dark">
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/login" element={<div>Login target</div>} />
          </Routes>
        </MemoryRouter>
      </Reshaped>,
    );
  }

  it("registers a valid user and redirects to login", async () => {
    const user = userEvent.setup();

    submit.mockResolvedValue(true);

    renderPage();

    await user.type(screen.getByLabelText("Name"), "Mathis");

    await user.type(screen.getByLabelText("Email"), "mathis@example.com");

    await user.type(screen.getByLabelText("Password"), "password123");

    await user.type(screen.getByLabelText("Confirm password"), "password123");

    await user.click(
      screen.getByRole("button", {
        name: "Create account",
      }),
    );

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith({
        name: "Mathis",
        email: "mathis@example.com",
        password: "password123",
      });
    });

    expect(await screen.findByText("Login target")).toBeTruthy();
  });

  it("does not register when passwords differ", async () => {
    const user = userEvent.setup();

    renderPage();

    await user.type(screen.getByLabelText("Name"), "Mathis");

    await user.type(screen.getByLabelText("Email"), "mathis@example.com");

    await user.type(screen.getByLabelText("Password"), "password123");

    await user.type(screen.getByLabelText("Confirm password"), "different123");

    await user.click(
      screen.getByRole("button", {
        name: "Create account",
      }),
    );

    expect(submit).not.toHaveBeenCalled();

    expect(screen.getByText("Passwords do not match.")).toBeTruthy();
  });

  it("does not redirect when registration fails", async () => {
    const user = userEvent.setup();

    submit.mockResolvedValue(false);

    renderPage();

    await user.type(screen.getByLabelText("Name"), "Mathis");

    await user.type(screen.getByLabelText("Email"), "mathis@example.com");

    await user.type(screen.getByLabelText("Password"), "password123");

    await user.type(screen.getByLabelText("Confirm password"), "password123");

    await user.click(
      screen.getByRole("button", {
        name: "Create account",
      }),
    );

    await waitFor(() => {
      expect(submit).toHaveBeenCalled();
    });

    expect(screen.queryByText("Login target")).toBeNull();
  });

  it("displays backend registration errors", () => {
    vi.mocked(useRegister).mockReturnValue({
      submit,
      isSubmitting: false,
      error: "Email already exists.",
    });

    renderPage();

    expect(screen.getByRole("alert").textContent).toContain(
      "Email already exists.",
    );
  });
});
