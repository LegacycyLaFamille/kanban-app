import { describe, it, expect, vi, afterEach } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";

import {
  errorHandler,
  logFatalProcessErrors,
} from "../../../shared/http/errorHandler.js";
import { logger } from "../../../shared/observability/logger.js";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.post("/api/v1/tasks/:taskId", () => {
    throw new Error("db exploded");
  });
  app.get("/api/v1/async", async () => {
    await Promise.resolve();
    throw new Error("async failure");
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  afterEach(() => vi.restoreAllMocks());

  it("answers malformed JSON with a JSON 400, and logs it without the body", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});

    const res = await request(buildApp())
      .post("/api/v1/tasks/task-1")
      .set("Content-Type", "application/json")
      .send('{"password": "hunter2"');

    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "The request body is not valid JSON.",
      },
    });
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        status: 400,
        errorType: "entity.parse.failed",
      }),
      "Rejected malformed request",
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("hunter2");
  });

  it("turns an uncaught error into a JSON 500 with its route, recorded on the span", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    const span = { recordException: vi.fn(), setStatus: vi.fn() };
    vi.spyOn(trace, "getActiveSpan").mockReturnValue(span as unknown as Span);

    const res = await request(buildApp())
      .post("/api/v1/tasks/task-1")
      .send({ title: "x" });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    // No stack trace or error message leaks to the client.
    expect(JSON.stringify(res.body)).not.toContain("db exploded");
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        route: "/api/v1/tasks/:taskId",
        status: 500,
        err: expect.any(Error),
      }),
      "Unhandled request error",
    );
    expect(span.recordException).toHaveBeenCalled();
    expect(span.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: "Unhandled request error",
    });
  });

  it("catches errors thrown by async handlers (Express 5)", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => {});

    const res = await request(buildApp()).get("/api/v1/async");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});

describe("logFatalProcessErrors", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs crashes as structured fatal logs, then exits", () => {
    const handlers = new Map<string, (value: unknown) => void>();
    vi.spyOn(process, "on").mockImplementation(((
      event: string,
      handler: (value: unknown) => void,
    ) => {
      handlers.set(event, handler);
      return process;
    }) as typeof process.on);
    const fatal = vi.spyOn(logger, "fatal").mockImplementation(() => {});
    const exit = vi.fn();

    logFatalProcessErrors(exit);
    handlers.get("unhandledRejection")?.(new Error("lost promise"));
    handlers.get("uncaughtException")?.(new Error("boom"));

    expect(fatal).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "Unhandled promise rejection",
    );
    expect(fatal).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "Uncaught exception",
    );
    expect(exit).toHaveBeenCalledTimes(2);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
