import { afterEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../../../shared/api";

import { downloadDataExport, getOwnedProjects } from "./dataExport.api";

describe("dataExport.api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retrieves the projects owned by the current user", async () => {
    const projects = [{ id: "p-1", name: "Kanban" }];
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue(projects);

    await expect(getOwnedProjects()).resolves.toEqual(projects);
    expect(getSpy).toHaveBeenCalledWith("/projects");
  });

  it("requests a single CSV export of every owned project", async () => {
    const blob = new Blob(["a"]);
    const getFileSpy = vi.spyOn(httpClient, "getFile").mockResolvedValue(blob);

    await expect(
      downloadDataExport({ format: "csv", layout: "single" }),
    ).resolves.toBe(blob);
    expect(getFileSpy).toHaveBeenCalledWith(
      "/auth/me/export?format=csv&layout=single",
    );
  });

  it("requests a per-project JSON export of the selected projects", async () => {
    const getFileSpy = vi
      .spyOn(httpClient, "getFile")
      .mockResolvedValue(new Blob());

    await downloadDataExport({
      format: "json",
      layout: "per-project",
      projectIds: ["p-1", "p-2"],
    });

    expect(getFileSpy).toHaveBeenCalledWith(
      "/auth/me/export?format=json&layout=per-project&projectIds=p-1%2Cp-2",
    );
  });
});
