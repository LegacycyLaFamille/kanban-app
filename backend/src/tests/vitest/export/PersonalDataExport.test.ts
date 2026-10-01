import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import express, { type NextFunction } from "express";
import request from "supertest";
import { strFromU8 } from "fflate";
import type { PersonalData } from "../../../modules/exports/DataExport.js";
import type { DataExportRepository } from "../../../modules/exports/DataExportRepository.js";
import {
  DataExportError,
  DataExportService,
} from "../../../modules/exports/DataExportService.js";
import { DataExportController } from "../../../modules/exports/DataExportController.js";

const NOW = new Date("2026-10-01T12:00:00.000Z");

const personalData: PersonalData = {
  account: {
    id: "user_1",
    email: "me@example.com",
    name: "Me",
    role: "USER",
    createdAt: new Date("2026-09-01T09:00:00.000Z"),
    updatedAt: new Date("2026-09-02T09:00:00.000Z"),
  },
  ownedProjects: [],
  memberships: [
    {
      projectId: "project_1",
      projectName: "Shared",
      role: "EDITOR",
      joinedAt: new Date("2026-09-03T09:00:00.000Z"),
    },
  ],
  assignedTasks: [],
  receivedInvitations: [],
  sentInvitations: [],
  notifications: [],
};

describe("DataExportService.exportPersonalData", () => {
  let repository: Mocked<DataExportRepository>;
  let service: DataExportService;

  beforeEach(() => {
    repository = { findOwnedProjects: vi.fn(), findPersonalData: vi.fn() };
    service = new DataExportService(repository);
  });

  it("returns the user's personal data as a dated JSON file", async () => {
    repository.findPersonalData.mockResolvedValue(personalData);

    const file = await service.exportPersonalData("user_1", NOW);

    expect(repository.findPersonalData).toHaveBeenCalledWith("user_1");
    expect(file.filename).toBe("kanban-personal-data-2026-10-01.json");
    expect(file.contentType).toBe("application/json; charset=utf-8");

    const json = JSON.parse(strFromU8(file.content));
    expect(json.exportedAt).toBe(NOW.toISOString());
    expect(json.account.email).toBe("me@example.com");
    expect(json.memberships).toHaveLength(1);
    expect(json.account).not.toHaveProperty("passwordHash");
  });

  it("fails when the user does not exist", async () => {
    repository.findPersonalData.mockResolvedValue(null);

    await expect(service.exportPersonalData("user_1", NOW)).rejects.toEqual(
      new DataExportError("USER_NOT_FOUND", "User not found"),
    );
  });
});

describe("DataExportController - GET /auth/me/personal-data", () => {
  let service: Mocked<Pick<DataExportService, "exportPersonalData">>;
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();

    service = { exportPersonalData: vi.fn() };

    const controller = new DataExportController(
      service as unknown as DataExportService,
    );

    const fakeAuth = (
      req: express.Request,
      _res: unknown,
      next: NextFunction,
    ) => {
      req.userId = "user_1";
      next();
    };

    app = express();
    app.get("/auth/me/personal-data", fakeAuth, controller.exportPersonalData);
  });

  it("sends the file as an uncached attachment", async () => {
    service.exportPersonalData.mockResolvedValue({
      filename: "kanban-personal-data-2026-10-01.json",
      contentType: "application/json; charset=utf-8",
      content: new TextEncoder().encode("{}"),
    });

    const res = await request(app).get("/auth/me/personal-data");

    expect(res.status).toBe(200);
    expect(service.exportPersonalData).toHaveBeenCalledWith("user_1");
    expect(res.headers["content-disposition"]).toBe(
      'attachment; filename="kanban-personal-data-2026-10-01.json"',
    );
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("returns 404 when the user no longer exists", async () => {
    service.exportPersonalData.mockRejectedValue(
      new DataExportError("USER_NOT_FOUND", "User not found"),
    );

    const res = await request(app).get("/auth/me/personal-data");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });
});
