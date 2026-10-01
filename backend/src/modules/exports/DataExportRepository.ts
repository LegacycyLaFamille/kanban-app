import type { ExportProject, PersonalData } from "./DataExport.js";

export interface DataExportRepository {
  findOwnedProjects(userId: string): Promise<ExportProject[]>;
  findPersonalData(userId: string): Promise<PersonalData | null>;
}
