import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import express, { type Express, type NextFunction } from "express";
import request from "supertest";
import { DataExportController } from "../../../modules/exports/DataExportController.js";
import {
  DataExportError,
  type DataExportService,
} from "../../../modules/exports/DataExportService.js";

const PROJECT_A = "aaaaaaaa-0000-4000-8000-000000000001";
const PROJECT_B = "aaaaaaaa-0000-4000-8000-000000000002";

describe("DataExportController - GET /auth/me/export", () => {
  let app: Express;
  let service: Mocked<Pick<DataExportService, "exportUserData">>;

  beforeEach(() => {
    vi.clearAllMocks();

    service = { exportUserData: vi.fn() };

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
    app.get("/auth/me/export", fakeAuth, controller.exportUserData);
  });

  it("renvoie le fichier en pièce jointe sans mise en cache", async () => {
    service.exportUserData.mockResolvedValue({
      filename: "kanban-export-2026-09-28.csv",
      contentType: "text/csv; charset=utf-8",
      content: new TextEncoder().encode("\uFEFFa,b\r\n"),
    });

    const res = await request(app).get("/auth/me/export");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toBe(
      'attachment; filename="kanban-export-2026-09-28.csv"',
    );
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(service.exportUserData).toHaveBeenCalledWith("user_1", {
      format: "csv",
      layout: "single",
    });
  });

  it("transmet la mise en page et les projets sélectionnés (dédoublonnés)", async () => {
    service.exportUserData.mockResolvedValue({
      filename: "kanban-export-2026-09-28.zip",
      contentType: "application/zip",
      content: new Uint8Array([80, 75]),
    });

    const res = await request(app).get(
      `/auth/me/export?format=json&layout=per-project&projectIds=${PROJECT_A}, ${PROJECT_B},${PROJECT_A}`,
    );

    expect(res.status).toBe(200);
    expect(service.exportUserData).toHaveBeenCalledWith("user_1", {
      format: "json",
      layout: "per-project",
      projectIds: [PROJECT_A, PROJECT_B],
    });
  });

  it("rejette une mise en page ou des identifiants invalides", async () => {
    const res = await request(app).get(
      "/auth/me/export?format=xml&layout=pdf&projectIds=not-a-uuid",
    );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.format).toBeDefined();
    expect(res.body.error.details.layout).toBeDefined();
    expect(res.body.error.details.projectIds).toBeDefined();
    expect(service.exportUserData).not.toHaveBeenCalled();
  });

  it("rejette une sélection vide et les paramètres inconnus", async () => {
    const emptySelection = await request(app).get(
      "/auth/me/export?projectIds=",
    );
    const unknownParam = await request(app).get("/auth/me/export?userId=other");

    expect(emptySelection.status).toBe(400);
    expect(unknownParam.status).toBe(400);
    expect(service.exportUserData).not.toHaveBeenCalled();
  });

  it("retourne 404 pour un projet non possédé", async () => {
    service.exportUserData.mockRejectedValue(
      new DataExportError("PROJECT_NOT_FOUND", "not found"),
    );

    const res = await request(app).get(
      `/auth/me/export?projectIds=${PROJECT_A}`,
    );

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("retourne 400 quand il n'y a rien à exporter", async () => {
    service.exportUserData.mockRejectedValue(
      new DataExportError("NOTHING_TO_EXPORT", "nothing"),
    );

    const res = await request(app).get("/auth/me/export");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NOTHING_TO_EXPORT");
  });

  it("retourne 500 sans détail interne en cas d'erreur", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    service.exportUserData.mockRejectedValue(new Error("db down"));

    const res = await request(app).get("/auth/me/export");

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("db down");
  });
});
