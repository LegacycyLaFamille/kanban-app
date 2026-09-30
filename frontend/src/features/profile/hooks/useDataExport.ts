import { useCallback, useState } from "react";

import { toUserMessage } from "../../../shared/api";
import { saveFile } from "../../../shared/utils/saveFile";

import { downloadDataExport } from "../api/dataExport.api";

import type { DataExportOptions } from "../types/profile.types";

const pad = (value: number) => String(value).padStart(2, "0");

export function exportFilename(
  options: DataExportOptions,
  now: Date = new Date(),
): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const extension = options.layout === "per-project" ? "zip" : options.format;

  return `kanban-export-${date}_${time}.${extension}`;
}

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(
    async (options: DataExportOptions): Promise<boolean> => {
      try {
        setIsExporting(true);
        setError(null);

        const blob = await downloadDataExport(options);

        saveFile(blob, exportFilename(options));

        return true;
      } catch (requestError) {
        setError(
          toUserMessage(
            requestError,
            "Unable to export your data. Please try again.",
          ),
        );

        return false;
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  return {
    exportData,
    isExporting,
    error,
  };
}
