import type { Request, Response } from "express";
import { TaskService } from "./TaskService.js";

export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  // POST /api/projects/:projectId/tasks
  async createTask(req: Request<{ projectId: string }>, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.userId!;
      const taskData = req.body;

      const task = await this.taskService.create(projectId, userId, taskData);

      return res.status(201).json(task);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  // GET /api/projects/:projectId/tasks
  async getTasksByProject(req: Request<{ projectId: string }>, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.userId!;

      const tasks = await this.taskService.read(projectId, userId);

      return res.status(200).json(tasks);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  // GET /api/tasks/:taskId
  async getTaskById(req: Request<{ taskId: string }>, res: Response) {
    try {
      const { taskId } = req.params;
      const userId = req.userId!;

      const task = await this.taskService.readSingle(taskId, userId);

      return res.status(200).json(task);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  // PATCH /api/tasks/:taskId
  async updateTask(req: Request<{ taskId: string }>, res: Response) {
    try {
      const { taskId } = req.params;
      const userId = req.userId!;
      const updateData = req.body;

      const updatedTask = await this.taskService.update(
        taskId,
        userId,
        updateData,
      );

      return res.status(200).json(updatedTask);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  // DELETE /api/tasks/:taskId
  async deleteTask(req: Request<{ taskId: string }>, res: Response) {
    try {
      const { taskId } = req.params;
      const userId = req.userId!;

      await this.taskService.delete(taskId, userId);

      return res.status(204).send();
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  private handleServiceError(error: unknown, res: Response) {
    const message = error instanceof Error ? error.message : error;

    if (message === "Forbidden") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You are not authorized to access this resource.",
        },
      });
    }

    if (message === "Not found" || message === "Project not found") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "The requested resource could not be found.",
        },
      });
    }

    console.error("[TaskController Error]", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  }
}
