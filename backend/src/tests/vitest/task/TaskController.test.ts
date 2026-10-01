import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import request from "supertest";

import { TaskController } from "../../../modules/tasks/TaskController.js";
import type { TaskService } from "../../../modules/tasks/TaskService.js";
import { Task } from "../../../modules/tasks/Task.js";
import {
  createTaskSchema,
  updateTaskSchema,
} from "../../../modules/tasks/task.schema.js";
import { validateSchema } from "../../../shared/http/validateSchema.js";

describe("TaskController validation", () => {
  let app: Express;
  let mockTaskService: Mocked<Pick<TaskService, "create" | "update">>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTaskService = {
      create: vi.fn(),
      update: vi.fn(),
    };

    const controller = new TaskController(
      mockTaskService as unknown as TaskService,
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
      "/projects/:projectId/tasks",
      fakeAuth,
      validateSchema(createTaskSchema),
      (req: Request<{ projectId: string }>, res: Response) =>
        controller.createTask(req, res),
    );
    app.patch(
      "/tasks/:taskId",
      fakeAuth,
      validateSchema(updateTaskSchema),
      (req: Request<{ taskId: string }>, res: Response) =>
        controller.updateTask(req, res),
    );
  });

  describe("POST /projects/:projectId/tasks", () => {
    it("creates a task with a valid payload", async () => {
      const task = new Task(
        "task-1",
        "Design the login page",
        "",
        "proj-1",
        "TODO",
        "Medium",
        null,
        new Date(),
        null,
      );
      mockTaskService.create.mockResolvedValue(task);

      const res = await request(app)
        .post("/projects/proj-1/tasks")
        .send({ title: "Design the login page" });

      expect(res.status).toBe(201);
      expect(mockTaskService.create).toHaveBeenCalledWith("proj-1", "user-1", {
        title: "Design the login page",
        description: "",
        status: "TODO",
        priority: "Medium",
      });
    });

    it("rejects a missing title", async () => {
      const res = await request(app).post("/projects/proj-1/tasks").send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.title).toBeDefined();
      expect(mockTaskService.create).not.toHaveBeenCalled();
    });

    it("rejects an invalid status value", async () => {
      const res = await request(app)
        .post("/projects/proj-1/tasks")
        .send({ title: "Task", status: "ARCHIVED" });

      expect(res.status).toBe(400);
      expect(res.body.error.details.status).toBeDefined();
      expect(mockTaskService.create).not.toHaveBeenCalled();
    });

    it("rejects an invalid priority value", async () => {
      const res = await request(app)
        .post("/projects/proj-1/tasks")
        .send({ title: "Task", priority: "URGENT" });

      expect(res.status).toBe(400);
      expect(res.body.error.details.priority).toBeDefined();
      expect(mockTaskService.create).not.toHaveBeenCalled();
    });

    it("rejects a malformed boardId", async () => {
      const res = await request(app)
        .post("/projects/proj-1/tasks")
        .send({ title: "Task", boardId: "not-a-uuid" });

      expect(res.status).toBe(400);
      expect(mockTaskService.create).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /tasks/:taskId", () => {
    it("accepts a status-only payload (drag-and-drop persistence)", async () => {
      mockTaskService.update.mockResolvedValue(
        new Task(
          "task-1",
          "Task",
          "",
          "proj-1",
          "DONE",
          "Medium",
          null,
          new Date(),
          null,
        ),
      );

      const res = await request(app)
        .patch("/tasks/task-1")
        .send({ status: "DONE" });

      expect(res.status).toBe(200);
      expect(mockTaskService.update).toHaveBeenCalledWith("task-1", "user-1", {
        status: "DONE",
      });
    });

    it("rejects an invalid status value", async () => {
      const res = await request(app)
        .patch("/tasks/task-1")
        .send({ status: "BLOCKED" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.status).toEqual([
        'Invalid option: expected one of "TODO"|"IN_PROGRESS"|"DONE"',
      ]);
      expect(mockTaskService.update).not.toHaveBeenCalled();
    });

    it("rejects an empty body", async () => {
      const res = await request(app).patch("/tasks/task-1").send({});

      expect(res.status).toBe(400);
      expect(mockTaskService.update).not.toHaveBeenCalled();
    });

    it("accepts an assigneeId, or null to unassign", async () => {
      mockTaskService.update.mockResolvedValue(
        new Task(
          "task-1",
          "Design the login page",
          "",
          "proj-1",
          "TODO",
          "Medium",
          null,
          new Date(),
          null,
        ),
      );
      const assigneeId = "6f1c2b7e-3a4d-4e5f-8a9b-0c1d2e3f4a5b";

      const assigned = await request(app)
        .patch("/tasks/task-1")
        .send({ assigneeId });
      const unassigned = await request(app)
        .patch("/tasks/task-1")
        .send({ assigneeId: null });

      expect(assigned.status).toBe(200);
      expect(unassigned.status).toBe(200);
      expect(mockTaskService.update).toHaveBeenNthCalledWith(
        1,
        "task-1",
        "user-1",
        { assigneeId },
      );
      expect(mockTaskService.update).toHaveBeenNthCalledWith(
        2,
        "task-1",
        "user-1",
        { assigneeId: null },
      );
    });

    it("rejects an assigneeId that is not a UUID", async () => {
      const res = await request(app)
        .patch("/tasks/task-1")
        .send({ assigneeId: "not-a-uuid" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(mockTaskService.update).not.toHaveBeenCalled();
    });

    it("returns 400 ASSIGNEE_NOT_PROJECT_MEMBER when the assignee has no project access", async () => {
      mockTaskService.update.mockRejectedValue(
        new Error("Assignee is not a member of this project"),
      );

      const res = await request(app)
        .patch("/tasks/task-1")
        .send({ assigneeId: "6f1c2b7e-3a4d-4e5f-8a9b-0c1d2e3f4a5b" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("ASSIGNEE_NOT_PROJECT_MEMBER");
    });

    it("rejects unknown fields", async () => {
      const res = await request(app)
        .patch("/tasks/task-1")
        .send({ status: "DONE", ownerId: "someone-else" });

      expect(res.status).toBe(400);
      expect(mockTaskService.update).not.toHaveBeenCalled();
    });
  });
});
