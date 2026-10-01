import type { ColumnId } from "../types";

export type DeadlineTone = "overdue" | "soon" | "neutral";

export interface DeadlineStatus {
  tone: DeadlineTone;
  label: string;
}

const DAY = 24 * 60 * 60 * 1000;
const SOON_DAYS = 2;

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * How urgent a deadline is, in words. Done tasks are never "overdue": the
 * date is shown for reference only.
 */
export function getDeadlineStatus(
  deadline: string | undefined,
  columnId: ColumnId,
  now: Date = new Date(),
): DeadlineStatus | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;

  const day = formatDay(date);
  if (columnId === "done") return { tone: "neutral", label: `Due ${day}` };

  if (date.getTime() < now.getTime()) {
    return { tone: "overdue", label: `Overdue · ${day}` };
  }

  const daysLeft = Math.round((startOfDay(date) - startOfDay(now)) / DAY);
  if (daysLeft === 0) return { tone: "soon", label: "Due today" };
  if (daysLeft === 1) return { tone: "soon", label: "Due tomorrow" };
  if (daysLeft <= SOON_DAYS) {
    return { tone: "soon", label: `Due in ${daysLeft} days` };
  }
  return { tone: "neutral", label: `Due ${day}` };
}
