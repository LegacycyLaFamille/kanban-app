import { recordError } from "../../shared/observability/recordError.js";
import type { Request, Response } from "express";
import { AdminTaskService } from "./AdminTaskService.js";
import type { AssignTaskInput } from "./admin.schema.js";

export class AdminTaskController {
  constructor(private readonly adminTaskService: AdminTaskService) {}

  listTasks = async (_req: Request, res: Response): Promise<void> => {
    try {
      const projectTasks = await this.adminTaskService.listAll();
      res.status(200).json(projectTasks);
    } catch (error) {
      recordError(error, "Admin task request failed");
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred.",
        },
      });
    }
  };

  assignTask = async (
    req: Request<{ taskId: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const { taskId } = req.params;
      const { assigneeId } = req.body as AssignTaskInput;

      const task = await this.adminTaskService.assign(
        taskId,
        assigneeId,
        req.userId ?? null,
      );

      res.status(200).json(task);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";

      if (message === "Not found") {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "The requested resource could not be found.",
          },
        });
        return;
      }

      if (message === "Assignee is not a member of this project") {
        res.status(400).json({
          error: {
            code: "ASSIGNEE_NOT_PROJECT_MEMBER",
            message:
              "The selected user is not a member of this task's project.",
          },
        });
        return;
      }

      recordError(error, "Admin task request failed");
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred.",
        },
      });
    }
  };
}
