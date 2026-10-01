import { describe, expect, it } from "vitest";

import type { Task } from "../types";
import { sortByPriority } from "./sortByPriority";

function task(id: string, priority?: Task["priority"]): Task {
  return {
    id,
    title: id,
    projectId: "project-1",
    columnId: "todo",
    ...(priority && { priority }),
  };
}

describe("sortByPriority", () => {
  it("puts high first, then medium, then low, then no priority", () => {
    const sorted = sortByPriority([
      task("low", "low"),
      task("none"),
      task("high", "high"),
      task("medium", "medium"),
    ]);

    expect(sorted.map((t) => t.id)).toEqual(["high", "medium", "low", "none"]);
  });

  it("keeps the original order within a priority", () => {
    const sorted = sortByPriority([
      task("medium-1", "medium"),
      task("high-1", "high"),
      task("medium-2", "medium"),
      task("high-2", "high"),
    ]);

    expect(sorted.map((t) => t.id)).toEqual([
      "high-1",
      "high-2",
      "medium-1",
      "medium-2",
    ]);
  });

  it("does not modify the given array", () => {
    const tasks = [task("low", "low"), task("high", "high")];

    sortByPriority(tasks);

    expect(tasks.map((t) => t.id)).toEqual(["low", "high"]);
  });
});
