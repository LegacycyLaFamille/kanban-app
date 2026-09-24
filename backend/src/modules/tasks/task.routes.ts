import { Router, type Request, type Response } from "express";
import { TaskController } from "./TaskController.js";
import { requireAuth } from "../../shared/security/requireAuth.js";
import { TaskService } from "./TaskService.js";
import { PrismaTaskRepository } from "./PrismaTaskRepository.js";
import { prisma } from "../../shared/database/prisma.js";
import { PrismaProjectRepository } from "../projects/PrismaProjectRepository.js";

export const taskRouter = Router();

const taskRepository = new PrismaTaskRepository(prisma);
const projectRepository = new PrismaProjectRepository(prisma);
const taskService = new TaskService(taskRepository, projectRepository);
const taskController = new TaskController(taskService);

taskRouter.post(
  "/projects/:projectId/tasks",
  requireAuth,
  (req: Request<{ projectId: string }>, res: Response) =>
    taskController.createTask(req, res),
);

taskRouter.get(
  "/projects/:projectId/tasks",
  requireAuth,
  (req: Request<{ projectId: string }>, res: Response) =>
    taskController.getTasksByProject(req, res),
);

taskRouter.get(
  "/tasks/:taskId",
  requireAuth,
  (req: Request<{ taskId: string }>, res: Response) =>
    taskController.getTaskById(req, res),
);

taskRouter.patch(
  "/tasks/:taskId",
  requireAuth,
  (req: Request<{ taskId: string }>, res: Response) =>
    taskController.updateTask(req, res),
);

taskRouter.delete(
  "/tasks/:taskId",
  requireAuth,
  (req: Request<{ taskId: string }>, res: Response) =>
    taskController.deleteTask(req, res),
);
