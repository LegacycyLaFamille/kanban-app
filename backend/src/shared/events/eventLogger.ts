// Structured logs of the event workflow: one JSON object per line, so the
// centralized logging stack (S2-36) can index them without parsing text.
// Every failure carries the event id and type; retries carry the attempt.

export interface EventLogFields {
  eventId?: string;
  eventType?: string;
  consumer?: string;
  attempt?: number;
  maxAttempts?: number;
  error?: string;
  [key: string]: unknown;
}

export type EventLogLevel = "info" | "warn" | "error";

export interface EventLogger {
  info(message: string, fields?: EventLogFields): void;
  warn(message: string, fields?: EventLogFields): void;
  error(message: string, fields?: EventLogFields): void;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const writers: Record<EventLogLevel, (line: string) => void> = {
  info: (line) => console.log(line),
  warn: (line) => console.warn(line),
  error: (line) => console.error(line),
};

export function createEventLogger(
  component: string,
  write: (level: EventLogLevel, line: string) => void = (level, line) =>
    writers[level](line),
): EventLogger {
  const log =
    (level: EventLogLevel) =>
    (message: string, fields: EventLogFields = {}) =>
      write(
        level,
        JSON.stringify({
          time: new Date().toISOString(),
          level,
          component,
          message,
          ...fields,
        }),
      );
  return { info: log("info"), warn: log("warn"), error: log("error") };
}
