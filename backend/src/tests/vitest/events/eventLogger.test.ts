import { describe, it, expect } from "vitest";
import { pino } from "pino";
import {
  createEventLogger,
  errorMessage,
} from "../../../shared/events/eventLogger.js";

function capture() {
  const lines: Record<string, unknown>[] = [];
  const base = pino(
    { level: "info" },
    {
      write: (line: string) => {
        lines.push(JSON.parse(line) as Record<string, unknown>);
      },
    },
  );
  return { base, lines };
}

describe("createEventLogger", () => {
  it("écrit une entrée JSON par niveau avec le composant et les champs", () => {
    const { base, lines } = capture();
    const logger = createEventLogger("event-bus", base);

    logger.info("started", { consumer: "c" });
    logger.warn("retry", { attempt: 2 });
    logger.error("lost");

    expect(lines.map((line) => line.level)).toEqual([30, 40, 50]);
    expect(lines[0]).toMatchObject({
      component: "event-bus",
      msg: "started",
      consumer: "c",
    });
    expect(lines[1]).toMatchObject({ msg: "retry", attempt: 2 });
    expect(lines[2]).toMatchObject({ component: "event-bus", msg: "lost" });
  });

  it("errorMessage accepte les erreurs et les autres valeurs", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("text")).toBe("text");
    expect(errorMessage(42)).toBe("42");
  });
});
