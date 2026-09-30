import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, render, screen, waitFor, within } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { Reshaped } from "reshaped";

import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { ApiError } from "../../../shared/api";

import type { AuthContextValue } from "../../auth/context/AuthContext";
import { useAuth } from "../../auth/hooks/useAuth";

import { getProfileStats, updateCurrentUser } from "../api/profile.api";

import { ProfilePage } from "./ProfilePage";

vi.mock("../../auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/profile.api", () => ({
  getProfileStats: vi.fn(),
  updateCurrentUser: vi.fn(),
}));

const currentUser = {
  id: "user-1",
  name: "Jane Doe",
  email: "jane@example.com",
  createdAt: "2026-09-01T10:00:00.000Z",
};

const stats = {
  projectCount: 3,
  taskCount: 8,
  tasksByStatus: { TODO: 3, IN_PROGRESS: 3, DONE: 2 },
};

describe("ProfilePage", () => {
  const refreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: currentUser,
      isAuthenticated: true,
      isInitializing: false,
      sessionError: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUser,
    } satisfies AuthContextValue);

    vi.mocked(getProfileStats).mockResolvedValue(stats);
    refreshUser.mockResolvedValue(undefined);
  });

  function renderPage() {
    const router = createMemoryRouter(
      [
        { path: "/profile", element: <ProfilePage /> },
        { path: "/projects", element: <div>Projects target</div> },
      ],
      { initialEntries: ["/profile"] },
    );

    render(
      <Reshaped theme="slate" defaultColorMode="dark">
        <RouterProvider router={router} />
      </Reshaped>,
    );

    return router;
  }

  it("displays the authenticated user's information", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Jane Doe" })).toBeTruthy();
    expect(screen.getByText("JD")).toBeTruthy();
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
      "Jane Doe",
    );
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(
      "jane@example.com",
    );
    expect(screen.getByText("1 September 2026")).toBeTruthy();
  });

  it("shows a loading state, then the account stats", async () => {
    renderPage();

    expect(
      screen.getByRole("status", { name: "Loading your activity" }),
    ).toBeTruthy();

    expect(await screen.findByText("Projects")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("invites the user to create a project when they own none", async () => {
    const user = userEvent.setup();

    vi.mocked(getProfileStats).mockResolvedValue({
      projectCount: 0,
      taskCount: 0,
      tasksByStatus: {},
    });

    const router = renderPage();

    expect(
      await screen.findByText("You don't own any projects yet."),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Go to projects" }));

    expect(router.state.location.pathname).toBe("/projects");
  });

  it("uses section headings for each part of the page", () => {
    renderPage();

    for (const name of [
      "Personal information",
      "Account overview",
      "Danger zone",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeTruthy();
      expect(screen.getByRole("region", { name })).toBeTruthy();
    }
  });

  it("shows an error with a retry when stats fail to load", async () => {
    const user = userEvent.setup();

    vi.mocked(getProfileStats)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(stats);

    renderPage();

    expect(
      await screen.findByText("Unable to load your activity."),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Projects")).toBeTruthy();
    expect(getProfileStats).toHaveBeenCalledTimes(2);
  });

  it("keeps the save button disabled until a field changes", async () => {
    const user = userEvent.setup();

    renderPage();

    const save = screen.getByRole("button", { name: "Save changes" });

    expect((save as HTMLButtonElement).disabled).toBe(true);

    await user.type(screen.getByLabelText("Name"), " Smith");

    expect((save as HTMLButtonElement).disabled).toBe(false);
  });

  it("sends only the changed fields and confirms the update", async () => {
    const user = userEvent.setup();

    vi.mocked(updateCurrentUser).mockResolvedValue({
      ...currentUser,
      name: "Jane Smith",
    });

    renderPage();

    const nameInput = screen.getByLabelText("Name");

    await user.clear(nameInput);
    await user.type(nameInput, "  Jane Smith ");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateCurrentUser).toHaveBeenCalledWith({ name: "Jane Smith" });
    });

    expect(refreshUser).toHaveBeenCalled();
    expect(
      await screen.findByText("Your profile has been updated."),
    ).toBeTruthy();
  });

  it("displays client-side validation errors without calling the API", async () => {
    const user = userEvent.setup();

    renderPage();

    const emailInput = screen.getByLabelText("Email");

    await user.clear(emailInput);
    await user.type(emailInput, "not-an-email");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      screen.getByText("Please enter a valid email address."),
    ).toBeTruthy();
    expect(document.activeElement).toBe(emailInput);
    expect(updateCurrentUser).not.toHaveBeenCalled();
  });

  it("asks for confirmation before leaving with unsaved changes", async () => {
    const user = userEvent.setup();

    const router = renderPage();

    await user.type(screen.getByLabelText("Name"), " Smith");

    await act(() => router.navigate("/projects"));

    const dialog = await screen.findByRole("dialog", {
      name: "Discard unsaved changes?",
    });

    await user.click(
      within(dialog).getByRole("button", { name: "Keep editing" }),
    );

    expect(router.state.location.pathname).toBe("/profile");

    await act(() => router.navigate("/projects"));

    await user.click(
      within(
        await screen.findByRole("dialog", { name: "Discard unsaved changes?" }),
      ).getByRole("button", { name: "Discard changes" }),
    );

    expect(await screen.findByText("Projects target")).toBeTruthy();
  });

  it("leaves without confirmation when nothing was edited", async () => {
    const router = renderPage();

    await act(() => router.navigate("/projects"));

    expect(await screen.findByText("Projects target")).toBeTruthy();
  });

  it("displays field errors returned by the API", async () => {
    const user = userEvent.setup();

    vi.mocked(updateCurrentUser).mockRejectedValue(
      new ApiError(
        409,
        "EMAIL_ALREADY_IN_USE",
        "This email is already used by another account.",
        { email: ["This email is already in use"] },
      ),
    );

    renderPage();

    const emailInput = screen.getByLabelText("Email");

    await user.clear(emailInput);
    await user.type(emailInput, "taken@example.com");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("This email is already in use"),
    ).toBeTruthy();
    await waitFor(() => {
      expect(document.activeElement).toBe(emailInput);
    });
    expect(refreshUser).not.toHaveBeenCalled();
  });

  it("displays a generic error when the update fails unexpectedly", async () => {
    const user = userEvent.setup();

    vi.mocked(updateCurrentUser).mockRejectedValue(new Error("network"));

    renderPage();

    await user.type(screen.getByLabelText("Name"), "!");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    const banner = await screen.findByText(
      "Unable to update your profile. Please try again.",
    );

    expect(banner.getAttribute("role")).toBe("alert");
  });

  it("requires typing the account email before confirming deletion", async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole("button", { name: "Delete account" }));

    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", {
      name: "Delete my account",
    });

    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    await user.type(within(dialog).getByRole("textbox"), "Jane@Example.com");

    expect((confirm as HTMLButtonElement).disabled).toBe(false);
  });

  it("validates the change password form in its dialog", async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole("button", { name: "Change password" }));

    const dialog = await screen.findByRole("dialog");

    await user.type(
      within(dialog).getByLabelText("Current password"),
      "old-password",
    );
    await user.type(within(dialog).getByLabelText("New password"), "short");
    await user.click(
      within(dialog).getByRole("button", { name: "Update password" }),
    );

    expect(
      within(dialog).getByText("Password must contain at least 8 characters."),
    ).toBeTruthy();
    expect(
      within(dialog).getByText("Please confirm your new password."),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      within(dialog).getByLabelText("New password"),
    );
  });

  it("can reveal the passwords typed in the dialog", async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole("button", { name: "Change password" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Change password",
    });
    const current = within(dialog).getByLabelText(
      "Current password",
    ) as HTMLInputElement;

    expect(current.type).toBe("password");

    await user.click(within(dialog).getByLabelText("Show passwords"));

    expect(current.type).toBe("text");
  });
});
