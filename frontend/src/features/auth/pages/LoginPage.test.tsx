import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { MemoryRouter, Route, Routes } from "react-router-dom";

import { Reshaped } from "reshaped";

import { login } from "../api/auth.api";
import { LoginPage } from "./LoginPage";

vi.mock("../api/auth.api", () => ({
  login: vi.fn(),
}));

function renderPage() {
  return render(
    <Reshaped theme="slate">
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/projects" element={<div>Projects target</div>} />
        </Routes>
      </MemoryRouter>
    </Reshaped>,
  );
}

describe("LoginPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits valid credentials and redirects to projects", async () => {
    const user = userEvent.setup();

    vi.mocked(login).mockResolvedValue({
      message: "Logged in.",
    });

    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");

    await user.type(screen.getByLabelText("Password"), "password123");

    await user.click(
      screen.getByRole("button", {
        name: "Sign in",
      }),
    );

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });

    expect(await screen.findByText("Projects target")).toBeTruthy();
  });

  it("does not call the API when email is invalid", async () => {
    const user = userEvent.setup();

    renderPage();

    await user.type(screen.getByLabelText("Email"), "invalid-email");

    await user.type(screen.getByLabelText("Password"), "password123");

    await user.click(
      screen.getByRole("button", {
        name: "Sign in",
      }),
    );

    expect(login).not.toHaveBeenCalled();

    expect(
      screen.getByText("Please enter a valid email address."),
    ).toBeTruthy();
  });
});
