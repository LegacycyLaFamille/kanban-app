import type { ErrorRequestHandler } from "express";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { logger } from "../observability/logger.js";

// body-parser errors carry a `type`, e.g. "entity.parse.failed".
interface HttpError {
  type?: string;
}

const CLIENT_ERRORS: Record<
  string,
  { status: number; code: string; message: string }
> = {
  "entity.parse.failed": {
    status: 400,
    code: "INVALID_JSON",
    message: "The request body is not valid JSON.",
  },
  "entity.too.large": {
    status: 413,
    code: "PAYLOAD_TOO_LARGE",
    message: "The request body is too large.",
  },
};

/**
 * Last-resort handler for errors no controller caught: malformed JSON, an
 * exception thrown by a middleware, a route that forgot its try/catch.
 * Answers with the standard JSON error shape (never Express's HTML page,
 * which shows the stack trace outside production) and records the error
 * with its request context: method, route and status, never the body,
 * the query string or the headers.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const context = {
    method: req.method,
    // The route pattern (/tasks/:taskId) when matched, else the path.
    route: (req.route as { path?: string } | undefined)?.path ?? req.path,
    userId: req.userId ?? null,
  };
  const httpError = error as HttpError;
  const clientError = httpError.type
    ? CLIENT_ERRORS[httpError.type]
    : undefined;

  if (clientError) {
    logger.warn(
      { ...context, status: clientError.status, errorType: httpError.type },
      "Rejected malformed request",
    );
    res.status(clientError.status).json({
      error: { code: clientError.code, message: clientError.message },
    });
    return;
  }

  const span = trace.getActiveSpan();
  span?.recordException(error instanceof Error ? error : String(error));
  span?.setStatus({
    code: SpanStatusCode.ERROR,
    message: "Unhandled request error",
  });
  logger.error(
    { ...context, status: 500, err: error },
    "Unhandled request error",
  );

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
};

/**
 * Crashes are logged as structured, trace-correlated logs before the
 * process exits, instead of a raw stack trace on stderr. The process still
 * exits: its state is unknown after an uncaught error.
 */
export function logFatalProcessErrors(
  exit: (code: number) => void = process.exit,
): void {
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "Unhandled promise rejection");
    exit(1);
  });
  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "Uncaught exception");
    exit(1);
  });
}
