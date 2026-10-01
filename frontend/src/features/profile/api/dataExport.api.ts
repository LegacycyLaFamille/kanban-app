import { httpClient } from "../../../shared/api";

import type { DataExportOptions, OwnedProject } from "../types/profile.types";

export function getOwnedProjects(): Promise<OwnedProject[]> {
  return httpClient.get<OwnedProject[]>("/projects");
}

export function downloadDataExport(options: DataExportOptions): Promise<Blob> {
  const params = new URLSearchParams({
    format: options.format,
    layout: options.layout,
  });

  if (options.projectIds) {
    params.set("projectIds", options.projectIds.join(","));
  }

  return httpClient.getFile(`/auth/me/export?${params.toString()}`);
}

export function downloadPersonalData(): Promise<Blob> {
  return httpClient.getFile("/auth/me/personal-data");
}
