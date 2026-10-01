import { Router, type Request, type Response } from "express";
import { eventBus } from "../../shared/events/index.js";
import { AdminTaskController } from "./AdminTaskController.js";
import { AdminTaskService } from "./AdminTaskService.js";
import { PrismaAdminTaskRepository } from "./PrismaAdminTaskRepository.js";
import { PrismaTaskRepository } from "../tasks/PrismaTaskRepository.js";
import { PrismaProjectRepository } from "../projects/PrismaProjectRepository.js";
import { PrismaProjectMemberRepository } from "../projects/PrismaProjectMemberRepository.js";
import { PrismaUserRepository } from "../users/PrismaUserRepository.js";
import { ProjectAccessGuard } from "../../shared/security/ProjectAccessGuard.js";
import { requireAuth } from "../../shared/security/requireAuth.js";
import { requireAdmin } from "../../shared/security/requireAdmin.js";
import { validateSchema } from "../../shared/http/validateSchema.js";
import { assignTaskSchema } from "./admin.schema.js";
import { prisma } from "../../shared/database/prisma.js";

export const adminRouter = Router();

const adminTaskRepository = new PrismaAdminTaskRepository(prisma);
const taskRepository = new PrismaTaskRepository(prisma);
const projectRepository = new PrismaProjectRepository(prisma);
const projectMemberRepository = new PrismaProjectMemberRepository(prisma);
const userRepository = new PrismaUserRepository(prisma);
const projectAccessGuard = new ProjectAccessGuard(
  projectRepository,
  projectMemberRepository,
);
const adminTaskService = new AdminTaskService(
  adminTaskRepository,
  taskRepository,
  projectRepository,
  projectAccessGuard,
  eventBus,
);
const adminTaskController = new AdminTaskController(adminTaskService);

// Every /admin route requires both a valid session (requireAuth) and the
// ADMIN role (requireAdmin) — a system-wide check, deliberately separate
// from ProjectAccessGuard's per-project owner/member authorization.
const requireAdminAccess = requireAdmin(userRepository);

adminRouter.get(
  "/admin/tasks",
  requireAuth,
  requireAdminAccess,
  (req: Request, res: Response) => adminTaskController.listTasks(req, res),
);

adminRouter.patch(
  "/admin/tasks/:taskId/assignee",
  requireAuth,
  requireAdminAccess,
  validateSchema(assignTaskSchema),
  (req: Request<{ taskId: string }>, res: Response) =>
    adminTaskController.assignTask(req, res),
);
