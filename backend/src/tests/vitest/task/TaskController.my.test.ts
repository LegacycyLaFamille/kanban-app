import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import express, { type Express, type NextFunction } from "express";
import request from "supertest";
import { TaskController } from "../../../modules/tasks/TaskController.js";
import type { TaskService } from "../../../modules/tasks/TaskService.js";
import { Task } from "../../../modules/tasks/Task.js";

describe("TaskController - GET /tasks/my", () => {
  let app: Express;
  let service: Mocked<Pick<TaskService, "readAssigned">>;

  const assigned = new Task(
    "task-1",
    "Relire la PR",
    "",
    "proj-1",
    "IN_PROGRESS",
    "High",
    new Date("2026-10-02T00:00:00.000Z"),
    new Date("2026-09-01T00:00:00.000Z"),
    null,
    "user-1",
  );

  beforeEach(() => {
    service = { readAssigned: vi.fn().mockResolvedValue([]) };
    const controller = new TaskController(service as unknown as TaskService);
    const fakeAuth = (
      req: express.Request,
      _res: unknown,
      next: NextFunction,
    ) => {
      req.userId = "user-1";
      next();
    };
    app = express();
    app.get("/tasks/my", fakeAuth, (req, res) =>
      controller.getMyTasks(req, res),
    );
  });

  it("renvoie les tâches assignées de l'utilisateur avec leur projet", async () => {
    service.readAssigned.mockResolvedValue([
      { task: assigned, project: { id: "proj-1", name: "Kanban" } },
    ]);

    const res = await request(app).get("/tasks/my");

    expect(res.status).toBe(200);
    expect(service.readAssigned).toHaveBeenCalledWith("user-1", {});
    expect(res.body).toEqual([
      {
        id: "task-1",
        title: "Relire la PR",
        description: "",
        projectId: "proj-1",
        status: "IN_PROGRESS",
        priority: "High",
        deadline: "2026-10-02T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        boardId: null,
        assigneeId: "user-1",
        project: { id: "proj-1", name: "Kanban" },
      },
    ]);
  });

  it("renvoie une liste vide quand rien n'est assigné", async () => {
    const res = await request(app).get("/tasks/my");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("transmet le filtre de statut", async () => {
    await request(app).get("/tasks/my?status=DONE");

    expect(service.readAssigned).toHaveBeenCalledWith("user-1", {
      status: "DONE",
    });
  });

  it.each(["status=done", "status=ARCHIVED", "assigneeId=user-2"])(
    "refuse la query %s",
    async (query) => {
      const res = await request(app).get(`/tasks/my?${query}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(service.readAssigned).not.toHaveBeenCalled();
    },
  );
});
