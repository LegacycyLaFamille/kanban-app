import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { Reshaped } from "reshaped";

import type { ReactNode } from "react";

import { EmptyState, ErrorState, LoadingState } from ".";

function renderInTheme(children: ReactNode) {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      {children}
    </Reshaped>,
  );
}

describe("Feedback states", () => {
  it("announces a loading state by its label", () => {
    renderInTheme(<LoadingState label="Loading projects" />);

    expect(
      screen.getByRole("status", { name: "Loading projects" }),
    ).toBeTruthy();
  });

  it("announces an error and lets the user retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    renderInTheme(
      <ErrorState
        title="Unable to load projects"
        message="Please try again."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Please try again.",
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits the retry button when the error is not recoverable", () => {
    renderInTheme(<ErrorState message="Please try again." />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows an empty state with its next action", () => {
    renderInTheme(
      <EmptyState
        title="No projects yet"
        description="Create your first project."
        action={<button type="button">Create project</button>}
      />,
    );

    expect(screen.getByText("No projects yet")).toBeTruthy();
    expect(screen.getByText("Create your first project.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create project" })).toBeTruthy();
  });
});
