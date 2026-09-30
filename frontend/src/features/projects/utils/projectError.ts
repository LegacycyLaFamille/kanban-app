import { ApiError } from "../../../shared/api";

export function projectErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  if (error.status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (error.status === 403) {
    return "You do not have permission to perform this action.";
  }

  return error.message || fallback;
}
