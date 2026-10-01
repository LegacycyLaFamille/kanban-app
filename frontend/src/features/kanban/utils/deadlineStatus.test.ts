import { describe, expect, it } from "vitest";

import { getDeadlineStatus } from "./deadlineStatus";

const now = new Date(2026, 9, 1, 10, 0); // 1 Oct 2026, 10:00 local

describe("getDeadlineStatus", () => {
  it("returns nothing without a valid deadline", () => {
    expect(getDeadlineStatus(undefined, "todo", now)).toBeNull();
    expect(getDeadlineStatus("not a date", "todo", now)).toBeNull();
  });

  it("flags a past deadline as overdue", () => {
    const deadline = new Date(2026, 8, 28, 18, 0).toISOString();

    const status = getDeadlineStatus(deadline, "in-progress", now);

    expect(status?.tone).toBe("overdue");
    // "Sep" or "Sept" depending on the ICU version.
    expect(status?.label).toMatch(/^Overdue · 28 Sep/);
  });

  it.each([
    [new Date(2026, 9, 1, 18, 0), "Due today"],
    [new Date(2026, 9, 2, 9, 0), "Due tomorrow"],
    [new Date(2026, 9, 3, 9, 0), "Due in 2 days"],
  ])("warns when the deadline is close (%s)", (date, label) => {
    expect(getDeadlineStatus(date.toISOString(), "todo", now)).toEqual({
      tone: "soon",
      label,
    });
  });

  it("stays neutral for a distant deadline", () => {
    const deadline = new Date(2026, 9, 20, 9, 0).toISOString();

    expect(getDeadlineStatus(deadline, "todo", now)?.tone).toBe("neutral");
  });

  it("never marks a done task as overdue", () => {
    const deadline = new Date(2026, 8, 28, 18, 0).toISOString();

    expect(getDeadlineStatus(deadline, "done", now)?.tone).toBe("neutral");
  });
});
