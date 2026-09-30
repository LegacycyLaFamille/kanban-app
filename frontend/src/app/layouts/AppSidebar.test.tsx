import { describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Reshaped } from "reshaped";

import { AppSidebar } from "./AppSidebar";

function renderSidebar(isAdmin: boolean) {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <MemoryRouter>
        <AppSidebar
          userName="Jane Doe"
          userEmail="jane@example.com"
          isAdmin={isAdmin}
        />
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
});
