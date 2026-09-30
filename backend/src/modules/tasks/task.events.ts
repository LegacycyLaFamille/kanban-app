import type { DomainEvent } from "../../shared/events/DomainEvent.js";
import type { Task } from "./Task.js";

export const TASK_DONE_STATUS = "DONE";

export type TaskField =
  "title" | "description" | "status" | "priority" | "deadline" | "boardId";

// Published after a task is persisted.
export type TaskCreatedEvent = DomainEvent<
  "task.created",
  {
    taskId: string;
    projectId: string;
    boardId: string | null;
    title: string;
    status: string;
    priority: string;
  }
>;

// Published after an update that actually changed at least one field.
export type TaskUpdatedEvent = DomainEvent<
  "task.updated",
  {
    taskId: string;
    projectId: string;
    title: string;
    changes: TaskField[];
    previousStatus: string;
    status: string;
  }
>;

// Published, in addition to task.updated, only when the status moves from
// another value to DONE.
export type TaskCompletedEvent = DomainEvent<
  "task.completed",
  {
    taskId: string;
    projectId: string;
    title: string;
    previousStatus: string;
  }
>;

export type TaskEvent =
  TaskCreatedEvent | TaskUpdatedEvent | TaskCompletedEvent;

const time = (date: Date | null) => (date === null ? null : date.getTime());

export function changedTaskFields(before: Task, after: Task): TaskField[] {
  const changes: TaskField[] = [];
  if (before.title !== after.title) changes.push("title");
  if (before.description !== after.description) changes.push("description");
  if (before.status !== after.status) changes.push("status");
  if (before.priority !== after.priority) changes.push("priority");
  if (time(before.deadline) !== time(after.deadline)) changes.push("deadline");
  if (before.boardId !== after.boardId) changes.push("boardId");
  return changes;
}

export function isCompletion(before: Task, after: Task): boolean {
  return (
    before.status !== TASK_DONE_STATUS && after.status === TASK_DONE_STATUS
  );
}
