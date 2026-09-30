import { describe, it, expect, vi, afterEach } from "vitest";
import { SpanStatusCode, type Span } from "@opentelemetry/api";
import { logger } from "../../../shared/observability/logger.js";
import { recordError } from "../../../shared/observability/recordError.js";

describe("recordError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("enregistre l'exception sur le span et la journalise", () => {
    const span = { recordException: vi.fn(), setStatus: vi.fn() };
    const log = vi.spyOn(logger, "error").mockImplementation(() => {});
    const error = new Error("db down");

    recordError(error, "Task request failed", span as unknown as Span);

    expect(span.recordException).toHaveBeenCalledWith(error);
    expect(span.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: "Task request failed",
    });
    expect(log).toHaveBeenCalledWith({ err: error }, "Task request failed");
  });

  it("journalise même sans span actif", () => {
    const log = vi.spyOn(logger, "error").mockImplementation(() => {});

    recordError("boom", "Login failed");

    expect(log).toHaveBeenCalledWith({ err: "boom" }, "Login failed");
  });
});
