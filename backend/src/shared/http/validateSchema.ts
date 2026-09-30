import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

/**
 * Validates req.body against a Zod schema at the route boundary, before any
 * controller or service logic runs — the trust-boundary point described in
 * docs/standards/API_CONVENTIONS.md §10.
 *
 * On success, req.body is replaced with the parsed data (so defaults and
 * trimming applied by the schema are visible downstream). On failure, the
 * request short-circuits with the standard API error shape used across the
 * backend (see §8): { error: { code: "VALIDATION_ERROR", message, details } }.
 */
export function validateSchema(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const { formErrors, fieldErrors } = z.flattenError(result.error);

      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: formErrors[0] ?? "Invalid request",
          details: fieldErrors,
        },
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
