import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import request from "supertest";

import { ProjectController } from "../../../modules/projects/ProjectController.js";
import type { ProjectService } from "../../../modules/projects/ProjectService.js";
import { Project } from "../../../modules/projects/Project.js";
import { ProjectMember } from "../../../modules/projects/ProjectMember.js";
import {
  addProjectMemberSchema,
  createProjectSchema,
  updateProjectSchema,
} from "../../../modules/projects/project.schema.js";
import { validateSchema } from "../../../shared/http/validateSchema.js";

describe("ProjectController validation", () => {
  let app: Express;
  let mockProjectService: Mocked<
    Pick<ProjectService, "create" | "update" | "addMember">
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProjectService = {
      create: vi.fn(),
      update: vi.fn(),
      addMember: vi.fn(),
    };

    const controller = new ProjectController(
      mockProjectService as unknown as ProjectService,
    );

    const fakeAuth = (
      req: express.Request,
      _res: unknown,
      next: NextFunction,
    ) => {
      req.userId = "user-1";
      next();
    };

    app = express();
    app.use(express.json());
    app.post(
      "/projects",
      fakeAuth,
      validateSchema(createProjectSchema),
      (req, res) => controller.createProject(req, res),
    );
    app.patch(
      "/projects/:projectId",
      fakeAuth,
      validateSchema(updateProjectSchema),
      (req: Request<{ projectId: string }>, res: Response) =>
        controller.updateProject(req, res),
    );
    app.post(
      "/projects/:projectId/members",
      fakeAuth,
      validateSchema(addProjectMemberSchema),
      (req: Request<{ projectId: string }>, res: Response) =>
        controller.addMember(req, res),
    );
  });

  describe("POST /projects", () => {
    it("creates a project with a valid payload", async () => {
      const project = new Project(
        "proj-1",
        "Kanban Rework",
        "Rebuild the board",
        "user-1",
        new Date("2026-09-01T00:00:00.000Z"),
      );
      mockProjectService.create.mockResolvedValue(project);

      const res = await request(app)
        .post("/projects")
        .send({ name: "Kanban Rework", description: "Rebuild the board" });

      expect(res.status).toBe(201);
      expect(mockProjectService.create).toHaveBeenCalledWith("user-1", {
        name: "Kanban Rework",
        description: "Rebuild the board",
      });
    });

    it("defaults description to an empty string when omitted", async () => {
      mockProjectService.create.mockResolvedValue(
        new Project("proj-1", "Kanban Rework", "", "user-1", new Date()),
      );

      await request(app).post("/projects").send({ name: "Kanban Rework" });

      expect(mockProjectService.create).toHaveBeenCalledWith("user-1", {
        name: "Kanban Rework",
        description: "",
      });
    });

    it("rejects a missing name", async () => {
      const res = await request(app).post("/projects").send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.name).toBeDefined();
      expect(mockProjectService.create).not.toHaveBeenCalled();
    });

    it("rejects a non-string name", async () => {
      const res = await request(app).post("/projects").send({ name: 123 });

      expect(res.status).toBe(400);
      expect(mockProjectService.create).not.toHaveBeenCalled();
    });

    it("rejects unknown fields", async () => {
      const res = await request(app)
        .post("/projects")
        .send({ name: "Kanban Rework", ownerId: "someone-else" });

      expect(res.status).toBe(400);
      expect(mockProjectService.create).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /projects/:projectId", () => {
    it("updates a project with a partial valid payload", async () => {
      mockProjectService.update.mockResolvedValue(
        new Project("proj-1", "Renamed", "desc", "user-1", new Date()),
      );

      const res = await request(app)
        .patch("/projects/proj-1")
        .send({ name: "Renamed" });

      expect(res.status).toBe(200);
      expect(mockProjectService.update).toHaveBeenCalledWith(
        "proj-1",
        "user-1",
        { name: "Renamed" },
      );
    });

    it("rejects an empty body", async () => {
      const res = await request(app).patch("/projects/proj-1").send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(mockProjectService.update).not.toHaveBeenCalled();
    });
  });

  describe("POST /projects/:projectId/members", () => {
    it("adds a member with a valid email", async () => {
      mockProjectService.addMember.mockResolvedValue(
        new ProjectMember("member-1", "proj-1", "user-2", new Date()),
      );

      const res = await request(app)
        .post("/projects/proj-1/members")
        .send({ email: "member@example.com" });

      expect(res.status).toBe(201);
      expect(mockProjectService.addMember).toHaveBeenCalledWith(
        "proj-1",
        "user-1",
        "member@example.com",
      );
    });

    it("rejects an invalid email", async () => {
      const res = await request(app)
        .post("/projects/proj-1/members")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(mockProjectService.addMember).not.toHaveBeenCalled();
    });

    it("rejects a missing email", async () => {
      const res = await request(app).post("/projects/proj-1/members").send({});

      expect(res.status).toBe(400);
      expect(mockProjectService.addMember).not.toHaveBeenCalled();
    });
  });
});
