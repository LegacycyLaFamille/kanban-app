import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import { AdminTaskController } from "../../../modules/admin/AdminTaskController.js";
import type { AdminTaskService } from "../../../modules/admin/AdminTaskService.js";
import { assignTaskSchema } from "../../../modules/admin/admin.schema.js";
import { validateSchema } from "../../../shared/http/validateSchema.js";
import { createRequireAuth } from "../../../shared/security/createRequireAuth.js";
import { requireAdmin } from "../../../shared/security/requireAdmin.js";
import { Task } from "../../../modules/tasks/Task.js";
import { User } from "../../../modules/users/User.js";
import type { UserRepository } from "../../../modules/users/UserRepository.js";

// jsonwebtoken is mocked: every token decodes to the mocked claims, and
// their session is always the active one.
const requireAuth = createRequireAuth({
  activeSessionId: async () => "session-1",
});

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

describe("AdminTaskController", () => {
  let app: Express;
  let mockAdminTaskService: Mocked<
    Pick<AdminTaskService, "listAll" | "assign">
  >;
  let mockUserRepository: { findById: ReturnType<typeof vi.fn> };

  const createdAt = new Date("2026-09-01T00:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test_secret";

    mockAdminTaskService = {
      listAll: vi.fn(),
      assign: vi.fn(),
    };
    mockUserRepository = { findById: vi.fn() };

    const controller = new AdminTaskController(
      mockAdminTaskService as unknown as AdminTaskService,
    );
    const requireAdminAccess = requireAdmin(
      mockUserRepository as unknown as UserRepository,
    );

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.get(
      "/admin/tasks",
      requireAuth,
      requireAdminAccess,
      controller.listTasks,
    );
    app.patch(
      "/admin/tasks/:taskId/assignee",
      requireAuth,
      requireAdminAccess,
      validateSchema(assignTaskSchema),
      controller.assignTask,
    );
  });

  describe("GET /admin/tasks", () => {
    it("rejects an unauthenticated request (requireAuth runs first)", async () => {
      const res = await request(app).get("/admin/tasks");

      expect(res.status).toBe(401);
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockAdminTaskService.listAll).not.toHaveBeenCalled();
    });

    it("rejects an authenticated non-admin with the standard 403 shape", async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        userId: "user-1",
        typ: "access",
        sid: "session-1",
      } as never);
      mockUserRepository.findById.mockResolvedValue(
        User.create("user@example.com", "Regular User", "user-1", createdAt),
      );

      const res = await request(app)
        .get("/admin/tasks")
        .set("Cookie", "accessToken=valid_token");

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: {
          code: "FORBIDDEN",
          message: "This action requires administrator access.",
        },
      });
      expect(mockAdminTaskService.listAll).not.toHaveBeenCalled();
    });

    it("returns the grouped task list for an admin", async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        userId: "admin-1",
        typ: "access",
        sid: "session-1",
      } as never);
      mockUserRepository.findById.mockResolvedValue(
        User.create(
          "admin@example.com",
          "Admin",
          "admin-1",
          createdAt,
          "ADMIN",
        ),
      );
      const groups = [
        {
          projectId: "proj-1",
          projectName: "Project",
          assignableUsers: [],
          tasks: [],
        },
      ];
      mockAdminTaskService.listAll.mockResolvedValue(groups);

      const res = await request(app)
        .get("/admin/tasks")
        .set("Cookie", "accessToken=valid_token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(groups);
    });
  });

  describe("PATCH /admin/tasks/:taskId/assignee", () => {
    beforeEach(() => {
      vi.mocked(jwt.verify).mockReturnValue({
        userId: "admin-1",
        typ: "access",
        sid: "session-1",
      } as never);
      mockUserRepository.findById.mockResolvedValue(
        User.create(
          "admin@example.com",
          "Admin",
          "admin-1",
          createdAt,
          "ADMIN",
        ),
      );
    });

    it("assigns the task and returns it", async () => {
      const assigneeId = "11111111-1111-4111-8111-111111111111";
      const updatedTask = new Task(
        "task-1",
        "Task",
        "",
        "proj-1",
        "TODO",
        "Medium",
        null,
        createdAt,
        null,
        assigneeId,
      );
      mockAdminTaskService.assign.mockResolvedValue(updatedTask);

      const res = await request(app)
        .patch("/admin/tasks/task-1/assignee")
        .set("Cookie", "accessToken=valid_token")
        .send({ assigneeId });

      expect(res.status).toBe(200);
      expect(mockAdminTaskService.assign).toHaveBeenCalledWith(
        "task-1",
        assigneeId,
        "admin-1",
      );
    });

    it("clears the assignee when assigneeId is null", async () => {
      const updatedTask = new Task(
        "task-1",
        "Task",
        "",
        "proj-1",
        "TODO",
        "Medium",
        null,
        createdAt,
        null,
        null,
      );
      mockAdminTaskService.assign.mockResolvedValue(updatedTask);

      const res = await request(app)
        .patch("/admin/tasks/task-1/assignee")
        .set("Cookie", "accessToken=valid_token")
        .send({ assigneeId: null });

      expect(res.status).toBe(200);
      expect(mockAdminTaskService.assign).toHaveBeenCalledWith(
        "task-1",
        null,
        "admin-1",
      );
    });

    it("rejects a malformed assigneeId with the standard validation error shape", async () => {
      const res = await request(app)
        .patch("/admin/tasks/task-1/assignee")
        .set("Cookie", "accessToken=valid_token")
        .send({ assigneeId: "not-a-uuid" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(mockAdminTaskService.assign).not.toHaveBeenCalled();
    });

    it("returns 400 when the assignee is not a project member", async () => {
      mockAdminTaskService.assign.mockRejectedValue(
        new Error("Assignee is not a member of this project"),
      );

      const res = await request(app)
        .patch("/admin/tasks/task-1/assignee")
        .set("Cookie", "accessToken=valid_token")
        .send({ assigneeId: "00000000-0000-0000-0000-000000000000" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("ASSIGNEE_NOT_PROJECT_MEMBER");
    });

    it("returns 404 when the task does not exist", async () => {
      mockAdminTaskService.assign.mockRejectedValue(new Error("Not found"));

      const res = await request(app)
        .patch("/admin/tasks/task-1/assignee")
        .set("Cookie", "accessToken=valid_token")
        .send({ assigneeId: "00000000-0000-0000-0000-000000000000" });

      expect(res.status).toBe(404);
    });
  });
});
