import { recordError } from "../../shared/observability/recordError.js";
import type { Request, Response } from "express";
import { z } from "zod";
import { TaskService } from "./TaskService.js";
import { myTasksQuerySchema } from "./task.schema.js";

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

  // GET /api/tasks/my
  async getMyTasks(req: Request, res: Response) {
    // validateSchema only covers the body: the query string is validated
    // here with the same error shape.
    const parsed = myTasksQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const { formErrors, fieldErrors } = z.flattenError(parsed.error);
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: formErrors[0] ?? "Invalid request",
          details: fieldErrors,
        },
      });
    }

    try {
      const { status } = parsed.data;
      const assigned = await this.taskService.readAssigned(
        req.userId!,
        status === undefined ? {} : { status },
      );
      return res
        .status(200)
        .json(assigned.map(({ task, project }) => ({ ...task, project })));
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

    if (message === "Assignee is not a member of this project") {
      return res.status(400).json({
        error: {
          code: "ASSIGNEE_NOT_PROJECT_MEMBER",
          message: "The selected user is not a member of this task's project.",
        },
      });
    }

    if (message === "Board is not part of this project") {
      return res.status(400).json({
        error: {
          code: "BOARD_NOT_IN_PROJECT",
          message: "The selected board does not belong to this task's project.",
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

    recordError(error, "Task request failed");
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  }
}
