import { Router, type Request, type Response } from "express";
import { ProjectController } from "./ProjectController.js";
import { requireAuth } from "../../shared/security/requireAuth.js";
import { validateSchema } from "../../shared/http/validateSchema.js";
import { ProjectService } from "./ProjectService.js";
import { PrismaProjectRepository } from "./PrismaProjectRepository.js";
import { PrismaProjectMemberRepository } from "./PrismaProjectMemberRepository.js";
import { PrismaUserRepository } from "../users/PrismaUserRepository.js";
import { ProjectAccessGuard } from "../../shared/security/ProjectAccessGuard.js";
import { prisma } from "../../shared/database/prisma.js";
import {
  addProjectMemberSchema,
  createProjectSchema,
  updateProjectMemberSchema,
  updateProjectSchema,
} from "./project.schema.js";

export const projectRouter = Router();

const projectRepository = new PrismaProjectRepository(prisma);
const projectMemberRepository = new PrismaProjectMemberRepository(prisma);
const userRepository = new PrismaUserRepository(prisma);
const projectAccessGuard = new ProjectAccessGuard(
  projectRepository,
  projectMemberRepository,
);
const projectService = new ProjectService(
  projectRepository,
  projectMemberRepository,
  userRepository,
  projectAccessGuard,
);
const projectController = new ProjectController(projectService);

projectRouter.post(
  "/projects",
  requireAuth,
  validateSchema(createProjectSchema),
  (req: Request, res: Response) => projectController.createProject(req, res),
);

projectRouter.get("/projects", requireAuth, (req: Request, res: Response) =>
  projectController.getProjects(req, res),
);

projectRouter.get(
  "/projects/:projectId",
  requireAuth,
  (req: Request<{ projectId: string }>, res: Response) =>
    projectController.getProjectById(req, res),
);

projectRouter.patch(
  "/projects/:projectId",
  requireAuth,
  validateSchema(updateProjectSchema),
  (req: Request<{ projectId: string }>, res: Response) =>
    projectController.updateProject(req, res),
);

projectRouter.delete(
  "/projects/:projectId",
  requireAuth,
  (req: Request<{ projectId: string }>, res: Response) =>
    projectController.deleteProject(req, res),
);

projectRouter.get(
  "/projects/:projectId/members",
  requireAuth,
  (req: Request<{ projectId: string }>, res: Response) =>
    projectController.getMembers(req, res),
);

projectRouter.get(
  "/projects/:projectId/team",
  requireAuth,
  (req: Request<{ projectId: string }>, res: Response) =>
    projectController.getTeam(req, res),
);

projectRouter.post(
  "/projects/:projectId/members",
  requireAuth,
  validateSchema(addProjectMemberSchema),
  (req: Request<{ projectId: string }>, res: Response) =>
    projectController.addMember(req, res),
);

projectRouter.patch(
  "/projects/:projectId/members/:memberUserId",
  requireAuth,
  validateSchema(updateProjectMemberSchema),
  (req: Request<{ projectId: string; memberUserId: string }>, res: Response) =>
    projectController.updateMemberRole(req, res),
);

projectRouter.delete(
  "/projects/:projectId/members/:memberUserId",
  requireAuth,
  (req: Request<{ projectId: string; memberUserId: string }>, res: Response) =>
    projectController.removeMember(req, res),
);
