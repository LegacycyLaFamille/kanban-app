import { describe, it, expect, vi } from "vitest";

import { PrismaTaskRepository } from "../../../modules/tasks/PrismaTaskRepository.js";
import { Task } from "../../../modules/tasks/Task.js";
import type { PrismaClient } from "../../../generated/prisma/client.js";

describe("PrismaTaskRepository", () => {
  describe("save", () => {
    it("returns the persisted task instead of void", async () => {
      // Regression test: save() used to `await this.prisma.task.upsert(...)`
      // without returning anything, so TaskService.create()'s
      // `if (!res) throw new Error("Task not created")` guard fired on
      // every successful creation, even though the row was written fine.
      const persistedRow = {
        id: "task-1",
        title: "Design the login page",
        description: "",
        projectId: "proj-1",
        status: "TODO",
        priority: "Medium",
        deadline: null,
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        boardId: null,
      };

      const upsert = vi.fn().mockResolvedValue(persistedRow);
      const mockPrisma = { task: { upsert } } as unknown as PrismaClient;
      const repository = new PrismaTaskRepository(mockPrisma);

      const task = new Task(
        "task-1",
        "Design the login page",
        "",
        "proj-1",
        "TODO",
        "Medium",
        null,
        new Date("2026-09-01T00:00:00.000Z"),
        null,
      );

      const result = await repository.save(task);

      expect(upsert).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(Task);
      expect(result).toEqual(task);
    });
  });

  describe("findAssignedTo", () => {
    const row = {
      id: "task-1",
      title: "Relire la PR",
      description: "",
      projectId: "proj-1",
      status: "TODO",
      priority: "High",
      deadline: new Date("2026-10-02T00:00:00.000Z"),
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      boardId: null,
      assigneeId: "user-1",
      project: { id: "proj-1", name: "Kanban" },
    };

    it("ne renvoie que les tâches assignées dans les projets encore accessibles", async () => {
      const findMany = vi.fn().mockResolvedValue([row]);
      const repository = new PrismaTaskRepository({
        task: { findMany },
      } as unknown as PrismaClient);

      const result = await repository.findAssignedTo("user-1");

      expect(findMany).toHaveBeenCalledWith({
        where: {
          assigneeId: "user-1",
          project: {
            OR: [
              { ownerId: "user-1" },
              { Member: { some: { userId: "user-1" } } },
            ],
          },
        },
        include: { project: { select: { id: true, name: true } } },
        orderBy: [
          { deadline: { sort: "asc", nulls: "last" } },
          { createdAt: "asc" },
        ],
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.task).toBeInstanceOf(Task);
      expect(result[0]!.task).toMatchObject({
        id: "task-1",
        assigneeId: "user-1",
        deadline: row.deadline,
      });
      expect(result[0]!.project).toEqual({ id: "proj-1", name: "Kanban" });
    });

    it("applique le filtre de statut", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const repository = new PrismaTaskRepository({
        task: { findMany },
      } as unknown as PrismaClient);

      await repository.findAssignedTo("user-1", { status: "DONE" });

      expect(findMany.mock.calls[0]![0].where).toMatchObject({
        assigneeId: "user-1",
        status: "DONE",
      });
    });
  });
});
