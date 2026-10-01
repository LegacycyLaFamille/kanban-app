import { pino, type LoggerOptions } from "pino";

export interface RecentLogEntry {
  time: string;
  level: "warn" | "error" | "fatal";
  component?: string;
  message: string;
}

// Last warnings and errors, kept in memory for the admin system page, so an
// admin sees that something went wrong without opening Grafana. Only the
// message and the `component` binding are kept: never the log's fields,
// which may hold request data.
const RECENT_LOG_LIMIT = 20;
const MESSAGE_MAX_LENGTH = 300;
const recentLogs: RecentLogEntry[] = [];

const LEVEL_NAMES: Record<number, RecentLogEntry["level"]> = {
  40: "warn",
  50: "error",
  60: "fatal",
};

function messageOf(args: unknown[]): string {
  const [first, second] = args;
  if (typeof first === "string") return first;
  if (typeof second === "string") return second;
  if (first instanceof Error) return first.message;
  if (first && typeof first === "object" && "msg" in first) {
    return String((first as { msg: unknown }).msg);
  }
  return "";
}

function remember(
  level: number,
  args: unknown[],
  bindings: Record<string, unknown>,
): void {
  const name = LEVEL_NAMES[level];
  if (!name) return;
  recentLogs.unshift({
    time: new Date().toISOString(),
    level: name,
    ...(typeof bindings.component === "string" && {
      component: bindings.component,
    }),
    message: messageOf(args).slice(0, MESSAGE_MAX_LENGTH),
  });
  recentLogs.length = Math.min(recentLogs.length, RECENT_LOG_LIMIT);
}

export function recentWarningsAndErrors(): RecentLogEntry[] {
  return recentLogs.map((entry) => ({ ...entry }));
}

export const loggerOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "*.password",
      "passwordHash",
      "*.passwordHash",
      "token",
      "*.token",
      "accessToken",
      "*.accessToken",
      "refreshToken",
      "*.refreshToken",
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
    ],
    censor: "[REDACTED]",
  },
  hooks: {
    logMethod(args, method, level) {
      if (level >= 40) remember(level, args, this.bindings());
      return method.apply(this, args);
    },
  },
};

export const logger = pino(loggerOptions);
