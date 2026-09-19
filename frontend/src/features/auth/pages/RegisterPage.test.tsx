import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { MemoryRouter, Route, Routes } from "react-router-dom";

import { Reshaped } from "reshaped";

import { register } from "../api/auth.api";
import { RegisterPage } from "./RegisterPage";

vi.mock("../api/auth.api", () => ({
  register: vi.fn(),
}));

function renderPage() {
  return render(
    <Reshaped theme="slate">
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/login" element={<div>Login target</div>} />
        </Routes>
      </MemoryRouter>
    </Reshaped>,
  );
}

describe("RegisterPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers a valid user and redirects to login", async () => {
    const user = userEvent.setup();

    vi.mocked(register).mockResolvedValue({
      message: "Account created.",
    });

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
      expect(register).toHaveBeenCalledWith({
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

    expect(register).not.toHaveBeenCalled();

    expect(screen.getByText("Passwords do not match.")).toBeTruthy();
  });
});
