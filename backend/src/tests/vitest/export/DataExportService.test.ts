import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import type {
  ExportBoard,
  ExportProject,
  ExportTask,
} from "../../../modules/exports/DataExport.js";
import type { DataExportRepository } from "../../../modules/exports/DataExportRepository.js";
import {
  DataExportService,
  EXPORT_COLUMNS,
  roleInProject,
} from "../../../modules/exports/DataExportService.js";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-09-28T12:00:00.000Z");

function task(overrides: Partial<ExportTask> = {}): ExportTask {
  return {
    id: "tttttttt-0000-4000-8000-000000000001",
    title: "Write specs",
    description: "Draft the spec",
    status: "DONE",
    priority: "NORMAL",
    deadline: null,
    createdAt: new Date("2026-09-03T09:00:00.000Z"),
    updatedAt: new Date("2026-09-04T09:00:00.000Z"),
    ...overrides,
  };
}

function board(overrides: Partial<ExportBoard> = {}): ExportBoard {
  return {
    id: "bbbbbbbb-0000-4000-8000-000000000001",
    name: "Sprint 1",
    createdAt: new Date("2026-09-02T09:00:00.000Z"),
    updatedAt: new Date("2026-09-02T10:00:00.000Z"),
    tasks: [task()],
    ...overrides,
  };
}

function project(overrides: Partial<ExportProject> = {}): ExportProject {
  return {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    name: "Kanban Platform",
    description: "Main project",
    ownerId: OWNER_ID,
    memberIds: [],
    createdAt: new Date("2026-09-01T09:00:00.000Z"),
    updatedAt: new Date("2026-09-02T09:00:00.000Z"),
    boards: [board()],
    unassignedTasks: [],
    ...overrides,
  };
}

function lines(content: Uint8Array): string[] {
  return strFromU8(content)
    .replace(/^\uFEFF/, "")
    .trimEnd()
    .split("\r\n");
}

function column(row: string, name: (typeof EXPORT_COLUMNS)[number]): string {
  return row.split(",")[EXPORT_COLUMNS.indexOf(name)]!;
}

describe("DataExportService", () => {
  let repository: Mocked<DataExportRepository>;
  let service: DataExportService;

  beforeEach(() => {
    repository = { findOwnedProjects: vi.fn() };
    service = new DataExportService(repository);
  });

  it("exporte tous les projets possédés dans un seul CSV", async () => {
    repository.findOwnedProjects.mockResolvedValue([
      project(),
      project({
        id: "aaaaaaaa-0000-4000-8000-000000000002",
        name: "Empty project",
        boards: [],
      }),
    ]);

    const file = await service.exportUserData(
      OWNER_ID,
      { format: "csv", layout: "single" },
      NOW,
    );

    expect(repository.findOwnedProjects).toHaveBeenCalledWith(OWNER_ID);
    expect(file.filename).toBe("kanban-export-2026-09-28.csv");
    expect(file.contentType).toBe("text/csv; charset=utf-8");

    const [header, taskRow, emptyProjectRow] = lines(file.content);

    expect(header).toBe(EXPORT_COLUMNS.join(","));
    expect(column(taskRow!, "project_name")).toBe("Kanban Platform");
    expect(column(taskRow!, "board_name")).toBe("Sprint 1");
    expect(column(taskRow!, "task_title")).toBe("Write specs");
    expect(column(emptyProjectRow!, "project_name")).toBe("Empty project");
    expect(column(emptyProjectRow!, "board_id")).toBe("");
    expect(emptyProjectRow!.split(",")).toHaveLength(EXPORT_COLUMNS.length);
  });

  it("décrit chaque tableau du projet, y compris ceux sans tâche", async () => {
    repository.findOwnedProjects.mockResolvedValue([
      project({
        boards: [
          board({
            tasks: [
              task(),
              task({
                id: "tttttttt-0000-4000-8000-000000000002",
                title: "Review specs",
              }),
            ],
          }),
          board({
            id: "bbbbbbbb-0000-4000-8000-000000000002",
            name: "Backlog",
            tasks: [],
          }),
        ],
        unassignedTasks: [
          task({
            id: "tttttttt-0000-4000-8000-000000000003",
            title: "Orphan task",
          }),
        ],
      }),
    ]);

    const file = await service.exportUserData(
      OWNER_ID,
      { format: "csv", layout: "single" },
      NOW,
    );
    const rows = lines(file.content).slice(1);

    expect(rows).toHaveLength(4);
    expect(
      rows.map((row) => [column(row, "board_name"), column(row, "task_title")]),
    ).toEqual([
      ["Sprint 1", "Write specs"],
      ["Sprint 1", "Review specs"],
      ["Backlog", ""],
      ["", "Orphan task"],
    ]);
    expect(column(rows[2]!, "board_id")).toBe(
      "bbbbbbbb-0000-4000-8000-000000000002",
    );
  });

  it("remplace les personnes par leur rôle dans le projet", async () => {
    repository.findOwnedProjects.mockResolvedValue([
      project({ memberIds: ["member-1", "member-2"] }),
    ]);

    const file = await service.exportUserData(
      OWNER_ID,
      { format: "csv", layout: "single" },
      NOW,
    );
    const row = lines(file.content)[1]!;

    expect(column(row, "project_owner")).toBe("owner");
    expect(column(row, "project_members")).toBe("member; member");
    expect(strFromU8(file.content)).not.toContain(OWNER_ID);
    expect(strFromU8(file.content)).not.toContain("member-1");
  });

  it("n'exporte que les projets sélectionnés", async () => {
    const other = project({
      id: "aaaaaaaa-0000-4000-8000-000000000002",
      name: "Other",
    });
    repository.findOwnedProjects.mockResolvedValue([project(), other]);

    const file = await service.exportUserData(
      OWNER_ID,
      { format: "csv", layout: "single", projectIds: [other.id] },
      NOW,
    );
    const content = strFromU8(file.content);

    expect(content).toContain("Other");
    expect(content).not.toContain("Kanban Platform");
  });

  it("refuse un projet inconnu ou appartenant à un autre utilisateur", async () => {
    repository.findOwnedProjects.mockResolvedValue([project()]);

    await expect(
      service.exportUserData(
        OWNER_ID,
        {
          format: "csv",
          layout: "single",
          projectIds: [project().id, "cccccccc-0000-4000-8000-000000000009"],
        },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
  });

  it("signale qu'il n'y a rien à exporter sans projet possédé", async () => {
    repository.findOwnedProjects.mockResolvedValue([]);

    await expect(
      service.exportUserData(
        OWNER_ID,
        { format: "csv", layout: "single" },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "NOTHING_TO_EXPORT" });
  });

  it("produit un zip avec un CSV par projet", async () => {
    repository.findOwnedProjects.mockResolvedValue([
      project(),
      project({
        id: "aaaaaaaa-0000-4000-8000-000000000002",
        name: "Café & Co!",
        boards: [],
      }),
    ]);

    const file = await service.exportUserData(
      OWNER_ID,
      { format: "csv", layout: "per-project" },
      NOW,
    );

    expect(file.filename).toBe("kanban-export-2026-09-28.zip");
    expect(file.contentType).toBe("application/zip");

    const entries = unzipSync(file.content);

    expect(Object.keys(entries).sort()).toEqual([
      "cafe-co-aaaaaaaa.csv",
      "kanban-platform-aaaaaaaa.csv",
    ]);
    expect(lines(entries["kanban-platform-aaaaaaaa.csv"]!)).toHaveLength(2);
    expect(lines(entries["cafe-co-aaaaaaaa.csv"]!)[1]).toContain("Café & Co!");
  });

  it("exporte en JSON projet → tableaux → tâches, avec les tâches sans tableau", async () => {
    repository.findOwnedProjects.mockResolvedValue([
      project({
        memberIds: ["member-1"],
        boards: [
          board(),
          board({
            id: "bbbbbbbb-0000-4000-8000-000000000002",
            name: "Backlog",
            tasks: [],
          }),
        ],
        unassignedTasks: [task({ title: "Orphan task" })],
      }),
    ]);

    const file = await service.exportUserData(
      OWNER_ID,
      { format: "json", layout: "single" },
      NOW,
    );

    expect(file.filename).toBe("kanban-export-2026-09-28.json");
    expect(file.contentType).toBe("application/json; charset=utf-8");

    const data = JSON.parse(strFromU8(file.content));

    expect(data.exportedAt).toBe(NOW.toISOString());
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0]).toMatchObject({
      name: "Kanban Platform",
      owner: "owner",
      members: ["member"],
      boards: [
        {
          name: "Sprint 1",
          tasks: [{ title: "Write specs", deadline: null }],
        },
        { name: "Backlog", tasks: [] },
      ],
      unassignedTasks: [{ title: "Orphan task" }],
    });
    expect(JSON.stringify(data)).not.toContain(OWNER_ID);
    expect(JSON.stringify(data)).not.toContain("member-1");
  });

  it("produit un zip avec un JSON par projet", async () => {
    repository.findOwnedProjects.mockResolvedValue([project()]);

    const file = await service.exportUserData(
      OWNER_ID,
      { format: "json", layout: "per-project" },
      NOW,
    );

    const entries = unzipSync(file.content);

    expect(Object.keys(entries)).toEqual(["kanban-platform-aaaaaaaa.json"]);

    const data = JSON.parse(
      strFromU8(entries["kanban-platform-aaaaaaaa.json"]!),
    );

    expect(data.projects[0].id).toBe(project().id);
    expect(data.projects[0].boards[0].tasks).toHaveLength(1);
  });

  it("attribue le rôle owner au propriétaire et member aux autres", () => {
    expect(roleInProject(OWNER_ID, project())).toBe("owner");
    expect(roleInProject("someone-else", project())).toBe("member");
  });
});
