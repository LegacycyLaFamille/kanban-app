import { describe, it, expect } from "vitest";
import { pino } from "pino";
import { loggerOptions } from "../../../shared/observability/logger.js";

describe("logger", () => {
  it("masque les mots de passe, jetons et cookies", () => {
    const lines: string[] = [];
    const log = pino(
      { ...loggerOptions, level: "info" },
      {
        write: (line: string) => {
          lines.push(line);
        },
      },
    );

    log.info(
      {
        password: "pw-secret",
        user: { refreshToken: "refresh-secret", name: "Alice" },
        req: {
          headers: {
            authorization: "Bearer auth-secret",
            cookie: "accessToken=cookie-secret",
          },
        },
      },
      "login attempt",
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toMatch(
      /pw-secret|refresh-secret|auth-secret|cookie-secret/,
    );
    expect(JSON.parse(lines[0]!)).toMatchObject({
      password: "[REDACTED]",
      user: { refreshToken: "[REDACTED]", name: "Alice" },
      req: {
        headers: { authorization: "[REDACTED]", cookie: "[REDACTED]" },
      },
    });
  });
});
