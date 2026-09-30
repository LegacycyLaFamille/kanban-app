import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor, within } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { Reshaped } from "reshaped";

import { ApiError } from "../../../shared/api";
import { saveFile } from "../../../shared/utils/saveFile";

import { downloadDataExport, getOwnedProjects } from "../api/dataExport.api";

import { DataExportSection } from "./DataExportSection";

vi.mock("../api/dataExport.api", () => ({
  getOwnedProjects: vi.fn(),
  downloadDataExport: vi.fn(),
}));

vi.mock("../../../shared/utils/saveFile", () => ({
  saveFile: vi.fn(),
}));

const projects = [
  { id: "p-1", name: "Kanban Platform" },
  { id: "p-2", name: "Mobile App" },
  { id: "p-3", name: "Website" },
];

const exportedFile = new Blob(["a,b"]);

const LOCAL_FILENAME =
  /^kanban-export-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.(csv|json|zip)$/;

describe("DataExportSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getOwnedProjects).mockResolvedValue(projects);
    vi.mocked(downloadDataExport).mockResolvedValue(exportedFile);
  });

  function renderSection() {
    render(
      <Reshaped theme="slate" defaultColorMode="dark">
        <DataExportSection />
      </Reshaped>,
    );
  }

  async function openDialog(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Export my data" }));

    return screen.findByRole("dialog", { name: "Export your data" });
  }

  function exportButton(dialog: HTMLElement): HTMLButtonElement {
    return within(dialog).getByRole("button", {
      name: "Export",
    }) as HTMLButtonElement;
  }

  it("loads the owned projects only when the dialog opens", async () => {
    const user = userEvent.setup();

    renderSection();

    expect(getOwnedProjects).not.toHaveBeenCalled();

    const dialog = await openDialog(user);

    expect(
      await within(dialog).findByLabelText("All owned projects (3)"),
    ).toBeTruthy();
    expect(getOwnedProjects).toHaveBeenCalledTimes(1);
  });

  it("exports every owned project as a single CSV by default", async () => {
    const user = userEvent.setup();

    renderSection();

    const dialog = await openDialog(user);

    await within(dialog).findByLabelText("All owned projects (3)");
    await user.click(exportButton(dialog));

    await waitFor(() => {
      expect(downloadDataExport).toHaveBeenCalledWith({
        format: "csv",
        layout: "single",
      });
    });

    expect(saveFile).toHaveBeenCalledWith(
      exportedFile,
      expect.stringMatching(LOCAL_FILENAME),
    );
    expect(vi.mocked(saveFile).mock.calls[0]![1]).toMatch(/\.csv$/);
    expect(
      await screen.findByText("Your export has been downloaded."),
    ).toBeTruthy();
  });

  it("exports only the selected projects, one CSV per project", async () => {
    const user = userEvent.setup();

    renderSection();

    const dialog = await openDialog(user);

    await user.click(await within(dialog).findByLabelText("Select projects"));

    expect(exportButton(dialog).disabled).toBe(true);
    expect(
      within(dialog).getByText("Select at least one project to export."),
    ).toBeTruthy();

    await user.click(within(dialog).getByLabelText("Mobile App"));
    await user.click(within(dialog).getByLabelText("Website"));
    await user.click(within(dialog).getByLabelText(/One file per project/));

    expect(within(dialog).getByText("2 of 3 selected")).toBeTruthy();

    await user.click(exportButton(dialog));

    await waitFor(() => {
      expect(downloadDataExport).toHaveBeenCalledWith({
        format: "csv",
        layout: "per-project",
        projectIds: ["p-2", "p-3"],
      });
    });
  });

  it("exports everything when all projects are selected", async () => {
    const user = userEvent.setup();

    renderSection();

    const dialog = await openDialog(user);

    await user.click(await within(dialog).findByLabelText("Select projects"));

    const selectAll = within(dialog).getByLabelText(
      "Select all",
    ) as HTMLInputElement;

    await user.click(within(dialog).getByLabelText("Website"));

    expect(selectAll.indeterminate).toBe(true);

    await user.click(selectAll);

    expect(within(dialog).getByText("3 of 3 selected")).toBeTruthy();

    await user.click(exportButton(dialog));

    await waitFor(() => {
      expect(downloadDataExport).toHaveBeenCalledWith({
        format: "csv",
        layout: "single",
      });
    });
  });

  it("explains there is nothing to export without owned projects", async () => {
    const user = userEvent.setup();

    vi.mocked(getOwnedProjects).mockResolvedValue([]);

    renderSection();

    const dialog = await openDialog(user);

    expect(
      await within(dialog).findByText(
        "You don't own any projects yet, so there is nothing to export.",
      ),
    ).toBeTruthy();
    expect(exportButton(dialog).disabled).toBe(true);
  });

  it("lets the user retry when projects fail to load", async () => {
    const user = userEvent.setup();

    vi.mocked(getOwnedProjects)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(projects);

    renderSection();

    const dialog = await openDialog(user);

    expect(
      await within(dialog).findByText("Unable to load your projects."),
    ).toBeTruthy();
    expect(exportButton(dialog).disabled).toBe(true);

    await user.click(within(dialog).getByRole("button", { name: "Retry" }));

    expect(
      await within(dialog).findByLabelText("All owned projects (3)"),
    ).toBeTruthy();
  });

  it("keeps the dialog open and shows the error when the export fails", async () => {
    const user = userEvent.setup();

    vi.mocked(downloadDataExport).mockRejectedValue(
      new ApiError(
        404,
        "PROJECT_NOT_FOUND",
        "One or more selected projects could not be found.",
      ),
    );

    renderSection();

    const dialog = await openDialog(user);

    await within(dialog).findByLabelText("All owned projects (3)");
    await user.click(exportButton(dialog));

    expect(
      await within(dialog).findByText(
        "One or more selected projects could not be found.",
      ),
    ).toBeTruthy();
    expect(saveFile).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("exports JSON when that file type is chosen", async () => {
    const user = userEvent.setup();

    renderSection();

    const dialog = await openDialog(user);

    await within(dialog).findByLabelText("All owned projects (3)");
    await user.click(within(dialog).getByLabelText(/^JSON/));
    await user.click(exportButton(dialog));

    await waitFor(() => {
      expect(downloadDataExport).toHaveBeenCalledWith({
        format: "json",
        layout: "single",
      });
    });

    expect(vi.mocked(saveFile).mock.calls[0]![1]).toMatch(
      /^kanban-export-.+\.json$/,
    );
  });

  it("names a per-project export as a zip archive", async () => {
    const user = userEvent.setup();

    renderSection();

    const dialog = await openDialog(user);

    await within(dialog).findByLabelText("All owned projects (3)");
    await user.click(within(dialog).getByLabelText(/^JSON/));
    await user.click(within(dialog).getByLabelText(/One file per project/));
    await user.click(exportButton(dialog));

    await waitFor(() => {
      expect(saveFile).toHaveBeenCalledWith(
        exportedFile,
        expect.stringMatching(/^kanban-export-.+\.zip$/),
      );
    });
  });
});
