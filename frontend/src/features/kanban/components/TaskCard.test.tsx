import { describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";
import { Reshaped } from "reshaped";

import type { Task } from "../types";
import { TaskCard } from "./TaskCard";

const DAY = 24 * 60 * 60 * 1000;

const task: Task = {
  id: "task-1",
  title: "Fix the login bug",
  projectId: "project-1",
  columnId: "in-progress",
  priority: "high",
  deadline: new Date(Date.now() - DAY).toISOString(),
  assignee: { id: "user-1", name: "Ada Lovelace" },
};

function renderCard(overrides: Partial<Task> = {}) {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <TaskCard task={{ ...task, ...overrides }} detailsId="details" />
    </Reshaped>,
  );
}

describe("TaskCard", () => {
  it("states priority, deadline and assignee in words, not by colour alone", () => {
    renderCard();

    const details = document.getElementById("details");
    expect(details?.textContent).toContain("Priority: High");
    expect(details?.textContent).toMatch(/Overdue · /);
    expect(details?.textContent).toContain("Assigned to Ada Lovelace");
  });

  it("tags each badge with its tone for the colour palette", () => {
    renderCard();

    expect(
      screen
        .getByText("High")
        .closest("[data-tone]")
        ?.getAttribute("data-tone"),
    ).toBe("high");
    expect(screen.getByText(/Overdue/).getAttribute("data-tone")).toBe(
      "overdue",
    );
  });

  it("does not flag a done task as overdue", () => {
    renderCard({ columnId: "done" });

    expect(screen.queryByText(/Overdue/)).toBeNull();
    expect(screen.getByText(/^Due /)).toBeTruthy();
  });

  it("shows no details line for a bare task", () => {
    renderCard({
      priority: undefined,
      deadline: undefined,
      assignee: undefined,
    });

    expect(document.getElementById("details")).toBeNull();
  });
});
