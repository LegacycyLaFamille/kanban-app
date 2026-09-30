import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { describe, expect, it, vi } from "vitest";

import { ProjectForm } from "./ProjectForm";

describe("ProjectForm", () => {
  it("rejects an empty project name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ProjectForm
        title="Create project"
        submitLabel="Create project"
        isSubmitting={false}
        serverError={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(onSubmit).not.toHaveBeenCalled();

    expect(screen.getByRole("alert").textContent).toContain(
      "Project name is required.",
    );
  });

  it("submits normalized project information", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);

    render(
      <ProjectForm
        title="Create project"
        submitLabel="Create project"
        isSubmitting={false}
        serverError={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Project name"), "  Kanban  ");

    await user.type(
      screen.getByLabelText("Description"),
      "  Project management  ",
    );

    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Kanban",
        description: "Project management",
      });
    });
  });

  it("displays an API error", () => {
    render(
      <ProjectForm
        title="Edit project"
        submitLabel="Save changes"
        initialValues={{
          name: "Kanban",
          description: "",
        }}
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

  it("keeps the form disabled while submitting", () => {
    render(
      <ProjectForm
        title="Edit project"
        submitLabel="Save changes"
        isSubmitting={true}
        serverError={null}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      (screen.getByRole("button", { name: "Saving..." }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
