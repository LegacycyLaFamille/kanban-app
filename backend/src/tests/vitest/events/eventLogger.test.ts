import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createEventLogger,
  errorMessage,
} from "../../../shared/events/eventLogger.js";

describe("createEventLogger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("écrit une ligne JSON par niveau sur la sortie correspondante", () => {
    const out = {
      info: vi.spyOn(console, "log").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
    const logger = createEventLogger("event-bus");

    logger.info("started", { consumer: "c" });
    logger.warn("retry", { attempt: 2 });
    logger.error("lost");

    for (const [level, spy] of Object.entries(out)) {
      expect(spy).toHaveBeenCalledOnce();
      const entry = JSON.parse(spy.mock.calls[0]![0] as string);
      expect(entry).toMatchObject({ level, component: "event-bus" });
      expect(Date.parse(entry.time)).not.toBeNaN();
    }
    expect(JSON.parse(out.warn.mock.calls[0]![0] as string)).toMatchObject({
      message: "retry",
      attempt: 2,
    });
  });

  it("errorMessage accepte les erreurs et les autres valeurs", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("text")).toBe("text");
    expect(errorMessage(42)).toBe("42");
  });
});
