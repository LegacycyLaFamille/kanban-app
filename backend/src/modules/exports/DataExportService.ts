import { strToU8, zipSync } from "fflate";
import { toCsv, type CsvValue } from "../../shared/export/csv.js";
import type {
  ExportFile,
  ExportFormat,
  ExportOptions,
  ExportProject,
} from "./DataExport.js";
import type { DataExportRepository } from "./DataExportRepository.js";

export type DataExportErrorCode = "PROJECT_NOT_FOUND" | "NOTHING_TO_EXPORT";

export class DataExportError extends Error {
  constructor(
    public readonly code: DataExportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DataExportError";
  }
}

export const EXPORT_COLUMNS = [
  "project_id",
  "project_name",
  "project_description",
  "project_created_at",
  "project_owner",
  "project_members",
  "board_name",
  "task_id",
  "task_title",
  "task_description",
  "task_status",
  "task_priority",
  "task_deadline",
  "task_created_at",
  "task_updated_at",
] as const;

const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
};

export type ProjectRole = "owner" | "member";

export function roleInProject(
  userId: string,
  project: ExportProject,
): ProjectRole {
  return userId === project.ownerId ? "owner" : "member";
}

function toRows(project: ExportProject): CsvValue[][] {
  const projectColumns: CsvValue[] = [
    project.id,
    project.name,
    project.description,
    project.createdAt,
    roleInProject(project.ownerId, project),
    project.memberIds
      .map((memberId) => roleInProject(memberId, project))
      .join("; "),
  ];

  if (project.tasks.length === 0) {
    return [
      [
        ...projectColumns,
        ...Array<CsvValue>(EXPORT_COLUMNS.length - projectColumns.length).fill(
          null,
        ),
      ],
    ];
  }

  return project.tasks.map((task) => [
    ...projectColumns,
    task.boardName,
    task.id,
    task.title,
    task.description,
    task.status,
    task.priority,
    task.deadline,
    task.createdAt,
    task.updatedAt,
  ]);
}

function toJsonProject(project: ExportProject) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    owner: roleInProject(project.ownerId, project),
    members: project.memberIds.map((memberId) =>
      roleInProject(memberId, project),
    ),
    tasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      deadline: task.deadline,
      board: task.boardName,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })),
  };
}

function serialize(
  format: ExportFormat,
  projects: ExportProject[],
  now: Date,
): string {
  if (format === "csv") {
    return toCsv(EXPORT_COLUMNS, projects.flatMap(toRows));
  }

  return JSON.stringify(
    { exportedAt: now, projects: projects.map(toJsonProject) },
    null,
    2,
  );
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export class DataExportService {
  constructor(private readonly repository: DataExportRepository) {}

  async exportUserData(
    userId: string,
    options: ExportOptions,
    now: Date = new Date(),
  ): Promise<ExportFile> {
    const projects = await this.selectProjects(userId, options.projectIds);

    if (projects.length === 0) {
      throw new DataExportError(
        "NOTHING_TO_EXPORT",
        "You don't own any projects to export.",
      );
    }

    const { format } = options;
    const basename = `kanban-export-${now.toISOString().slice(0, 10)}`;

    if (options.layout === "single") {
      return {
        filename: `${basename}.${format}`,
        contentType: CONTENT_TYPES[format],
        content: strToU8(serialize(format, projects, now)),
      };
    }

    const entries: Record<string, Uint8Array> = {};

    for (const project of projects) {
      const name = `${slugify(project.name) || "project"}-${project.id.slice(0, 8)}.${format}`;

      entries[name] = strToU8(serialize(format, [project], now));
    }

    return {
      filename: `${basename}.zip`,
      contentType: "application/zip",
      content: zipSync(entries, { level: 6, mtime: now }),
    };
  }

  private async selectProjects(
    userId: string,
    projectIds: string[] | undefined,
  ): Promise<ExportProject[]> {
    const ownedProjects = await this.repository.findOwnedProjects(userId);

    if (!projectIds) {
      return ownedProjects;
    }

    const requested = new Set(projectIds);
    const selected = ownedProjects.filter((project) =>
      requested.has(project.id),
    );

    if (selected.length !== requested.size) {
      throw new DataExportError(
        "PROJECT_NOT_FOUND",
        "One or more selected projects could not be found.",
      );
    }

    return selected;
  }
}
