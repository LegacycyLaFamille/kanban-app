import { ApiError } from "./ApiError";

export function toUserMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  if (error.status >= 500 || error.code === "UNKNOWN_ERROR") {
    return fallback;
  }

  return error.message || fallback;
}
