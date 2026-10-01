import type { Task, TaskPriority } from "../types";

const RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
// Tasks without a priority go last.
const NO_PRIORITY = 3;

/**
 * High first, then medium, then low, then tasks without a priority. Tasks
 * of the same priority keep their order (the sort is stable).
 */
export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      (a.priority ? RANK[a.priority] : NO_PRIORITY) -
      (b.priority ? RANK[b.priority] : NO_PRIORITY),
  );
}
