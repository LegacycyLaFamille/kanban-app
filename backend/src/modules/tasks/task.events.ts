import {
  createEvent,
  type DomainEvent,
} from "../../shared/events/DomainEvent.js";
import type { Task } from "./Task.js";

export const TASK_DONE_STATUS = "DONE";

export type TaskField =
  | "title"
  | "description"
  | "status"
  | "priority"
  | "deadline"
  | "boardId"
  | "assigneeId";

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
    // Absent on events published before assignment existed.
    assigneeId?: string | null;
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
    // Assignee after / before the update. Absent on older events.
    assigneeId?: string | null;
    previousAssigneeId?: string | null;
  }
>;

// Published when a task gets a (new) assignee: at creation, through
// PATCH /tasks/:taskId or through the admin assignment route. Not published
// when the assignment is cleared.
export type TaskAssignedEvent = DomainEvent<
  "task.assigned",
  {
    taskId: string;
    projectId: string;
    title: string;
    assigneeId: string;
    previousAssigneeId: string | null;
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
  TaskCreatedEvent | TaskUpdatedEvent | TaskCompletedEvent | TaskAssignedEvent;

const time = (date: Date | null) => (date === null ? null : date.getTime());

export function changedTaskFields(before: Task, after: Task): TaskField[] {
  const changes: TaskField[] = [];
  if (before.title !== after.title) changes.push("title");
  if (before.description !== after.description) changes.push("description");
  if (before.status !== after.status) changes.push("status");
  if (before.priority !== after.priority) changes.push("priority");
  if (time(before.deadline) !== time(after.deadline)) changes.push("deadline");
  if (before.boardId !== after.boardId) changes.push("boardId");
  if (before.assigneeId !== after.assigneeId) changes.push("assigneeId");
  return changes;
}

// null when the task has no assignee (nothing to announce).
export function createTaskAssignedEvent(
  task: Task,
  previousAssigneeId: string | null,
  actorId: string | null,
): TaskAssignedEvent | null {
  if (!task.assigneeId) return null;
  return createEvent(
    "task.assigned",
    {
      taskId: task.id,
      projectId: task.projectId,
      title: task.title,
      assigneeId: task.assigneeId,
      previousAssigneeId,
    },
    { actorId },
  );
}

export function isCompletion(before: Task, after: Task): boolean {
  return (
    before.status !== TASK_DONE_STATUS && after.status === TASK_DONE_STATUS
  );
}
