import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { describe, expect, it, vi } from "vitest";

import { BoardForm } from "./BoardForm";

describe("BoardForm", () => {
  it("requires a board name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <BoardForm
        title="Create board"
        submitLabel="Create board"
        isSubmitting={false}
        serverError={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create board" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "Board name is required.",
    );
  });

  it("submits a trimmed board name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);

    render(
      <BoardForm
        title="Create board"
        submitLabel="Create board"
        isSubmitting={false}
        serverError={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Board name" }),
      "  Development  ",
    );

    await user.click(screen.getByRole("button", { name: "Create board" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Development",
      });
    });
  });

  it("prefills the name when renaming a board", () => {
    render(
      <BoardForm
        title="Rename board"
        submitLabel="Save changes"
        initialName="Development"
        isSubmitting={false}
        serverError={null}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      (
        screen.getByRole("textbox", {
          name: "Board name",
        }) as HTMLInputElement
      ).value,
    ).toBe("Development");
  });

  it("displays a backend error", () => {
    render(
      <BoardForm
        title="Create board"
        submitLabel="Create board"
        isSubmitting={false}
        serverError="You do not have permission to perform this action."
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "You do not have permission",
    );
  });

  it("disables actions while submitting", () => {
    render(
      <BoardForm
        title="Rename board"
        submitLabel="Save changes"
        initialName="Development"
        isSubmitting={true}
        serverError={null}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      (
        screen.getByRole("button", {
          name: "Saving...",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    expect(
      (
        screen.getByRole("button", {
          name: "Cancel",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
