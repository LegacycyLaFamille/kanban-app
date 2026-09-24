import { Router, type Request, type Response } from "express";
import { ProjectController } from "./ProjectController.js";
import { requireAuth } from "../../shared/security/requireAuth.js";
import { ProjectService } from "./ProjectService.js";
import { PrismaProjectRepository } from "./PrismaProjectRepository.js";
import { prisma } from "../../shared/database/prisma.js";

export const projectRouter = Router();

const projectRepository = new PrismaProjectRepository(prisma);
const projectService = new ProjectService(projectRepository);
const projectController = new ProjectController(projectService);

projectRouter.post("/projects", requireAuth, (req: Request, res: Response) =>
  projectController.createProject(req, res),
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
  // validateSchema(updateProjectSchema),
  (req: Request<{ projectId: string }>, res: Response) =>
    projectController.updateProject(req, res),
);

projectRouter.delete(
  "/projects/:projectId",
  requireAuth,
  (req: Request<{ projectId: string }>, res: Response) =>
    projectController.deleteProject(req, res),
);
