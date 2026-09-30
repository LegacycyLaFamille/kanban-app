import { describe, expect, it } from "vitest";

import { ApiError } from "./ApiError";
import { toUserMessage } from "./errorMessage";

const FALLBACK = "Unable to load projects.";

describe("toUserMessage", () => {
  it("returns the API message for client errors", () => {
    const error = new ApiError(404, "NOT_FOUND", "Project not found.");

    expect(toUserMessage(error, FALLBACK)).toBe("Project not found.");
  });

  it("hides server errors behind the fallback", () => {
    const error = new ApiError(
      500,
      "INTERNAL_SERVER_ERROR",
      'relation "projects" does not exist',
    );

    expect(toUserMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  it("hides responses that carry no structured error", () => {
    const error = new ApiError(400, "UNKNOWN_ERROR", "Bad Request");

    expect(toUserMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  it("uses the fallback for non-API errors", () => {
    expect(toUserMessage(new TypeError("Failed to fetch"), FALLBACK)).toBe(
      FALLBACK,
    );
  });
});
