export type ExportFormat = "csv" | "json";

export type ExportLayout = "single" | "per-project";

export interface ExportTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  deadline: Date | null;
  boardName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportProject {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
  tasks: ExportTask[];
}

export interface ExportOptions {
  format: ExportFormat;
  layout: ExportLayout;
  projectIds?: string[] | undefined;
}

export interface ExportFile {
  filename: string;
  contentType: string;
  content: Uint8Array;
}
