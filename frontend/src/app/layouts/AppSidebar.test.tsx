import { describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { Reshaped } from "reshaped";

import { AppSidebar } from "./AppSidebar";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="current-path">{location.pathname}</div>;
}

function renderSidebar(isAdmin: boolean, notificationCount = 0) {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <MemoryRouter initialEntries={["/projects"]}>
        <AppSidebar
          userName="Jane Doe"
          userEmail="jane@example.com"
          isAdmin={isAdmin}
          notificationCount={notificationCount}
        />
        <LocationProbe />
      </MemoryRouter>
    </Reshaped>,
  );
}

describe("AppSidebar", () => {
  it("shows an Admin badge for an admin user", () => {
    renderSidebar(true);

    expect(screen.getByText("Admin")).toBeTruthy();
  });

  it("does not show an Admin badge for a regular user", () => {
    renderSidebar(false);

    expect(screen.queryByText("Admin")).toBeNull();
  });

  it("does not show a Settings entry", () => {
    renderSidebar(false);

    expect(screen.queryByText("Settings")).toBeNull();
  });

  it("shows no Dashboard entry for a regular user", () => {
    renderSidebar(false);

    expect(screen.queryByText("Dashboard")).toBeNull();
    expect(screen.queryByText("Legacy")).toBeNull();
  });

  it("shows Dashboard and Legacy nav entries for an admin user", () => {
    renderSidebar(true);

    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Legacy")).toBeTruthy();
  });

  it("navigates the admin's Dashboard entry to /admin/dashboard", async () => {
    const user = userEvent.setup();
    renderSidebar(true);

    await user.click(screen.getByText("Dashboard"));

    expect(screen.getByTestId("current-path").textContent).toBe(
      "/admin/dashboard",
    );
  });

  it("shows the unread notification count on the Notifications entry", () => {
    renderSidebar(false, 3);

    expect(screen.getByLabelText("3 unread notifications").textContent).toBe(
      "3",
    );
  });

  it("caps the unread notification badge at 99+", () => {
    renderSidebar(false, 150);

    expect(screen.getByText("99+")).toBeTruthy();
  });

  it("shows no notification badge when everything is read", () => {
    renderSidebar(false, 0);

    expect(screen.queryByLabelText(/unread notifications/)).toBeNull();
  });

  it("navigates the admin's Legacy entry to /", async () => {
    const user = userEvent.setup();
    renderSidebar(true);

    await user.click(screen.getByText("Legacy"));

    expect(screen.getByTestId("current-path").textContent).toBe("/");
  });
});
