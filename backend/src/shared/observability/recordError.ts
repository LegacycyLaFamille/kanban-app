import { SpanStatusCode, trace, type Span } from "@opentelemetry/api";
import { logger } from "./logger.js";

export function recordError(
  error: unknown,
  message: string,
  span: Span | undefined = trace.getActiveSpan(),
): void {
  span?.recordException(error instanceof Error ? error : String(error));
  span?.setStatus({ code: SpanStatusCode.ERROR, message });
  logger.error({ err: error }, message);
}
