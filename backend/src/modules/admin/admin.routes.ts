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
import { readFileSync } from "node:fs";
import path from "node:path";
import { rabbitMq } from "../../shared/events/rabbitmq/index.js";
import { DEAD_LETTER_QUEUE } from "../../shared/events/rabbitmq/topology.js";
import { retryQueueName } from "../../shared/events/rabbitmq/RabbitMqEventBus.js";
import { eventTotals } from "../../shared/observability/eventMetrics.js";
import { recentWarningsAndErrors } from "../../shared/observability/logger.js";
import { NOTIFICATION_CONSUMER } from "../notifications/notification.consumer.js";
import { AdminSystemController } from "./AdminSystemController.js";
import { AdminSystemService } from "./AdminSystemService.js";
import { PrismaAdminStatsRepository } from "./PrismaAdminStatsRepository.js";

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

function backendVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

const adminSystemService = new AdminSystemService({
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
  brokerStatus: () => rabbitMq.status(),
  inspectQueue: (name) => rabbitMq.inspectQueue(name),
  queues: [
    { name: NOTIFICATION_CONSUMER, role: "consumer" },
    { name: retryQueueName(NOTIFICATION_CONSUMER), role: "retry" },
    { name: DEAD_LETTER_QUEUE, role: "dead_letter" },
  ],
  statsRepository: new PrismaAdminStatsRepository(prisma),
  eventTotals,
  recentProblems: recentWarningsAndErrors,
  application: {
    version: backendVersion(),
    environment: process.env.NODE_ENV ?? "development",
    startedAt: new Date(Date.now() - process.uptime() * 1000),
  },
  // Where admins open Grafana, e.g. http://localhost:3001 in development.
  grafanaUrl: process.env.GRAFANA_URL || null,
});
const adminSystemController = new AdminSystemController(adminSystemService);

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

adminRouter.get(
  "/admin/system",
  requireAuth,
  requireAdminAccess,
  (req: Request, res: Response) => adminSystemController.getStatus(req, res),
);
