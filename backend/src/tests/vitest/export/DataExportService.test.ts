import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import type { ExportProject } from "../../../modules/exports/DataExport.js";
import type { DataExportRepository } from "../../../modules/exports/DataExportRepository.js";
import {
  DataExportService,
  EXPORT_COLUMNS,
  roleInProject,
} from "../../../modules/exports/DataExportService.js";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-09-28T12:00:00.000Z");

function project(overrides: Partial<ExportProject> = {}): ExportProject {
  return {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    name: "Kanban Platform",
    description: "Main project",
    ownerId: OWNER_ID,
    memberIds: [],
    createdAt: new Date("2026-09-01T09:00:00.000Z"),
    updatedAt: new Date("2026-09-02T09:00:00.000Z"),
    tasks: [
      {
        id: "tttttttt-0000-4000-8000-000000000001",
        title: "Write specs",
        description: "Draft the spec",
        status: "DONE",
        priority: "NORMAL",
        deadline: null,
        boardName: "Sprint 1",
        createdAt: new Date("2026-09-03T09:00:00.000Z"),
        updatedAt: new Date("2026-09-04T09:00:00.000Z"),
      },
    ],
    ...overrides,
  };
}

function lines(content: Uint8Array): string[] {
  return strFromU8(content)
    .replace(/^\uFEFF/, "")
    .trimEnd()
    .split("\r\n");
}

describe("DataExportService", () => {
  let repository: Mocked<DataExportRepository>;
  let service: DataExportService;

  beforeEach(() => {
    repository = { findOwnedProjects: vi.fn() };
    service = new DataExportService(repository);
  });

  it("exporte tous les projets possédés dans un seul CSV, une ligne par tâche", async () => {
    const second = project({
      id: "aaaaaaaa-0000-4000-8000-000000000002",
      name: "Empty project",
      tasks: [],
    });
    repository.findOwnedProjects.mockResolvedValue([project(), second]);

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
    expect(taskRow).toContain("Kanban Platform");
    expect(taskRow).toContain("Write specs");
    expect(emptyProjectRow).toMatch(/^aaaaaaaa-0000-4000-8000-000000000002,/);
    expect(emptyProjectRow!.split(",")).toHaveLength(EXPORT_COLUMNS.length);
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
    const row = lines(file.content)[1]!.split(",");

    expect(row[EXPORT_COLUMNS.indexOf("project_owner")]).toBe("owner");
    expect(row[EXPORT_COLUMNS.indexOf("project_members")]).toBe(
      "member; member",
    );
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
          projectIds: [project().id, "bbbbbbbb-0000-4000-8000-000000000009"],
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
        tasks: [],
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

  it("attribue le rôle owner au propriétaire et member aux autres", () => {
    expect(roleInProject(OWNER_ID, project())).toBe("owner");
    expect(roleInProject("someone-else", project())).toBe("member");
  });
  it("exporte en JSON structuré avec les rôles à la place des personnes", async () => {
    repository.findOwnedProjects.mockResolvedValue([
      project({ memberIds: ["member-1"] }),
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
      tasks: [{ title: "Write specs", board: "Sprint 1", deadline: null }],
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
    expect(
      JSON.parse(strFromU8(entries["kanban-platform-aaaaaaaa.json"]!))
        .projects[0].id,
    ).toBe(project().id);
  });
});
