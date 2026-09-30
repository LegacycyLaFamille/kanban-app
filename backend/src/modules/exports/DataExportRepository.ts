import type { ExportProject } from "./DataExport.js";

export interface DataExportRepository {
  findOwnedProjects(userId: string): Promise<ExportProject[]>;
}
