import { describe, it, expect } from "vitest";
import { pino } from "pino";
import {
  loggerOptions,
  recentWarningsAndErrors,
} from "../../../shared/observability/logger.js";

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

describe("recent warnings and errors", () => {
  const silent = { write: () => {} };

  it("keeps warnings and errors with their component, never their fields", () => {
    const log = pino({ ...loggerOptions, level: "info" }, silent).child({
      component: "rabbitmq",
    });

    log.info("not kept");
    log.warn({ email: "alice@example.com" }, "connection lost");
    log.error(new Error("broker down"));

    const [latest, previous] = recentWarningsAndErrors();
    expect(latest).toMatchObject({
      level: "error",
      component: "rabbitmq",
      message: "broker down",
    });
    expect(previous).toMatchObject({
      level: "warn",
      message: "connection lost",
    });
    const entries = JSON.stringify(recentWarningsAndErrors());
    expect(entries).not.toContain("alice");
    expect(entries).not.toContain("not kept");
  });

  it("keeps the 20 most recent entries", () => {
    const log = pino({ ...loggerOptions, level: "info" }, silent);

    for (let i = 0; i < 30; i++) log.warn(`warning ${i}`);

    const entries = recentWarningsAndErrors();
    expect(entries).toHaveLength(20);
    expect(entries[0]?.message).toBe("warning 29");
  });
});
