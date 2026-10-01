import { Router, type Request, type Response } from "express";
import { prisma } from "../../shared/database/prisma.js";
import { validateSchema } from "../../shared/http/validateSchema.js";
import { ProjectAccessGuard } from "../../shared/security/ProjectAccessGuard.js";
import { requireAuth } from "../../shared/security/requireAuth.js";
import { PrismaProjectMemberRepository } from "../projects/PrismaProjectMemberRepository.js";
import { PrismaProjectRepository } from "../projects/PrismaProjectRepository.js";
import { PrismaUserRepository } from "../users/PrismaUserRepository.js";
import { PrismaProjectInvitationRepository } from "./PrismaProjectInvitationRepository.js";
import { ProjectInvitationController } from "./ProjectInvitationController.js";
import { ProjectInvitationService } from "./ProjectInvitationService.js";
import { inviteProjectMemberSchema } from "./invitation.schema.js";

export const invitationRouter = Router();

const projectMemberRepository = new PrismaProjectMemberRepository(prisma);
const invitationService = new ProjectInvitationService(
  new PrismaProjectInvitationRepository(prisma),
  projectMemberRepository,
  new PrismaUserRepository(prisma),
  new ProjectAccessGuard(
    new PrismaProjectRepository(prisma),
    projectMemberRepository,
  ),
);
const invitationController = new ProjectInvitationController(invitationService);

// Project owner side.
invitationRouter.post(
  "/projects/:projectId/invitations",
  requireAuth,
  validateSchema(inviteProjectMemberSchema),
  (req: Request<{ projectId: string }>, res: Response) =>
    invitationController.invite(req, res),
);

invitationRouter.get(
  "/projects/:projectId/invitations",
  requireAuth,
  (req: Request<{ projectId: string }>, res: Response) =>
    invitationController.listForProject(req, res),
);

invitationRouter.delete(
  "/projects/:projectId/invitations/:invitationId",
  requireAuth,
  (req: Request<{ projectId: string; invitationId: string }>, res: Response) =>
    invitationController.cancel(req, res),
);

// Invitee side.
invitationRouter.get(
  "/invitations",
  requireAuth,
  (req: Request, res: Response) => invitationController.listMine(req, res),
);

invitationRouter.post(
  "/invitations/:invitationId/accept",
  requireAuth,
  (req: Request<{ invitationId: string }>, res: Response) =>
    invitationController.accept(req, res),
);

invitationRouter.post(
  "/invitations/:invitationId/decline",
  requireAuth,
  (req: Request<{ invitationId: string }>, res: Response) =>
    invitationController.decline(req, res),
);
