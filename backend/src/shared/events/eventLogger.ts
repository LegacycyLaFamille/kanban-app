import type { Logger } from "pino";
import { logger as rootLogger } from "../observability/logger.js";

export interface EventLogFields {
  eventId?: string;
  eventType?: string;
  consumer?: string;
  attempt?: number;
  maxAttempts?: number;
  error?: string;
  [key: string]: unknown;
}

export interface EventLogger {
  info(message: string, fields?: EventLogFields): void;
  warn(message: string, fields?: EventLogFields): void;
  error(message: string, fields?: EventLogFields): void;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createEventLogger(
  component: string,
  base: Logger = rootLogger,
): EventLogger {
  const log = base.child({ component });
  return {
    info: (message, fields = {}) => log.info(fields, message),
    warn: (message, fields = {}) => log.warn(fields, message),
    error: (message, fields = {}) => log.error(fields, message),
  };
}
