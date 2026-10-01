import type { Request, Response } from "express";
import { recordError } from "../../shared/observability/recordError.js";
import type { AdminSystemService } from "./AdminSystemService.js";

export class AdminSystemController {
  constructor(private readonly adminSystemService: AdminSystemService) {}

  // Always 200 when the status could be computed, even if the system is
  // "down": the body says what is wrong, the request itself succeeded.
  getStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.set("Cache-Control", "no-store");
      res.status(200).json(await this.adminSystemService.status());
    } catch (error) {
      recordError(error, "Admin system status failed");
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred.",
        },
      });
    }
  };
}
