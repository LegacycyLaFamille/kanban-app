import { z } from "zod";

// The definitive set of Kanban columns/statuses. Kept in sync with the
// frontend's TaskStatus type (frontend/src/features/kanban/types/task.types.ts)
// and the columns rendered in Board.tsx — update both sides together.
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

// Matches the frontend's TaskPriority type exactly (same module as above).
// NOTE: docs/openapi.yaml previously documented a different, stale enum
// (LOW/NORMAL/HIGH) that the frontend never actually sends — corrected here
// and in the OpenAPI doc to match real runtime values.
export const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;

const titleSchema = z.string().trim().min(1, "Title is required").max(200);
const descriptionSchema = z.string().trim().max(5000);
const statusSchema = z.enum(TASK_STATUSES);
const prioritySchema = z.enum(TASK_PRIORITIES);
const isoDateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date",
  });
const boardIdSchema = z.uuid();

export const createTaskSchema = z.strictObject({
  title: titleSchema,
  // Task.description/status/priority are required, non-nullable columns
  // (schema.prisma); default them so a minimal { title } payload still
  // produces a valid domain Task instead of failing downstream.
  description: descriptionSchema.default(""),
  status: statusSchema.default("TODO"),
  priority: prioritySchema.default("Medium"),
  deadline: isoDateString.nullable().optional(),
  boardId: boardIdSchema.nullable().optional(),
});

export const updateTaskSchema = z
  .strictObject({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    deadline: isoDateString.nullable().optional(),
    boardId: boardIdSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.status !== undefined ||
      data.priority !== undefined ||
      data.deadline !== undefined ||
      data.boardId !== undefined,
    { message: "At least one field must be provided" },
  );

// Query string of GET /tasks/my.
export const myTasksQuerySchema = z.strictObject({
  status: statusSchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
