import { Router, type Request, type Response } from "express";
import { requireAuth } from "../../shared/security/requireAuth.js";
import { prisma } from "../../shared/database/prisma.js";
import { PrismaProjectRepository } from "../projects/PrismaProjectRepository.js";
import { PrismaProjectMemberRepository } from "../projects/PrismaProjectMemberRepository.js";
import { PrismaNotificationRepository } from "./PrismaNotificationRepository.js";
import { NotificationService } from "./NotificationService.js";
import { NotificationController } from "./NotificationController.js";

export const notificationRouter = Router();

const notificationService = new NotificationService(
  new PrismaNotificationRepository(prisma),
  new PrismaProjectRepository(prisma),
  new PrismaProjectMemberRepository(prisma),
);
const notificationController = new NotificationController(notificationService);

notificationRouter.get(
  "/notifications",
  requireAuth,
  (req: Request, res: Response) => notificationController.list(req, res),
);

// Declared before /:notificationId routes so "unread-count" is never read
// as an id.
notificationRouter.get(
  "/notifications/unread-count",
  requireAuth,
  (req: Request, res: Response) => notificationController.unreadCount(req, res),
);

notificationRouter.post(
  "/notifications/read-all",
  requireAuth,
  (req: Request, res: Response) => notificationController.markAllRead(req, res),
);

notificationRouter.patch(
  "/notifications/:notificationId/read",
  requireAuth,
  (req: Request<{ notificationId: string }>, res: Response) =>
    notificationController.markRead(req, res),
);
