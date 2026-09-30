import { describe, expect, it } from "vitest";

import { exportFilename } from "./useDataExport";

describe("exportFilename", () => {
  const now = new Date(2026, 8, 28, 1, 5);

  it("uses the local date and time with the file type extension", () => {
    expect(exportFilename({ format: "csv", layout: "single" }, now)).toBe(
      "kanban-export-2026-09-28_01-05.csv",
    );
    expect(exportFilename({ format: "json", layout: "single" }, now)).toBe(
      "kanban-export-2026-09-28_01-05.json",
    );
  });

  it("uses a zip extension when exporting one file per project", () => {
    expect(exportFilename({ format: "json", layout: "per-project" }, now)).toBe(
      "kanban-export-2026-09-28_01-05.zip",
    );
  });
});
