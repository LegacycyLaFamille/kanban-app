import { recordError } from "../../shared/observability/recordError.js";
import type { Request, Response } from "express";
import type { ExportFile } from "./DataExport.js";
import { z } from "zod";
import {
  DataExportError,
  type DataExportService,
} from "./DataExportService.js";

const MAX_SELECTED_PROJECTS = 100;

const exportQuerySchema = z.strictObject({
  format: z.enum(["csv", "json"]).default("csv"),
  layout: z.enum(["single", "per-project"]).default("single"),
  projectIds: z
    .string()
    .optional()
    .transform((value) =>
      value === undefined
        ? undefined
        : [
            ...new Set(
              value
                .split(",")
                .map((id) => id.trim())
                .filter(Boolean),
            ),
          ],
    )
    .pipe(z.array(z.uuid()).min(1).max(MAX_SELECTED_PROJECTS).optional()),
});

function sendFile(res: Response, file: ExportFile): void {
  res
    .status(200)
    .set({
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "no-store",
    })
    .send(Buffer.from(file.content));
}

export class DataExportController {
  constructor(private readonly dataExportService: DataExportService) {}

  exportUserData = async (req: Request, res: Response): Promise<void> => {
    try {
      const options = exportQuerySchema.parse(req.query);

      const file = await this.dataExportService.exportUserData(
        req.userId!,
        options,
      );

      sendFile(res, file);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const { formErrors, fieldErrors } = z.flattenError(error);

        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: formErrors[0] ?? "Invalid request",
            details: fieldErrors,
          },
        });
        return;
      }

      if (error instanceof DataExportError) {
        res
          .status(error.code === "PROJECT_NOT_FOUND" ? 404 : 400)
          .json({ error: { code: error.code, message: error.message } });
        return;
      }

      recordError(error, "Data export failed");
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
      });
    }
  };

  exportPersonalData = async (req: Request, res: Response): Promise<void> => {
    try {
      const file = await this.dataExportService.exportPersonalData(req.userId!);

      sendFile(res, file);
    } catch (error: unknown) {
      if (error instanceof DataExportError) {
        res
          .status(404)
          .json({ error: { code: error.code, message: error.message } });
        return;
      }

      recordError(error, "Personal data export failed");
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
      });
    }
  };
}
