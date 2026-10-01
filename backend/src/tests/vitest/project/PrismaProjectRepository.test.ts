import { describe, it, expect, vi } from "vitest";

import { PrismaProjectRepository } from "../../../modules/projects/PrismaProjectRepository.js";
import { Board } from "../../../modules/boards/Board.js";
import type { PrismaClient } from "../../../generated/prisma/client.js";

const createdAt = new Date("2026-09-01T00:00:00.000Z");

const projectRow = {
  id: "proj-1",
  name: "Marketing Site",
  description: "",
  ownerId: "user-1",
  createdAt,
  updatedAt: createdAt,
  Board: [
    { id: "board-1", name: "Design", projectId: "proj-1", createdAt },
    { id: "board-2", name: "Dev", projectId: "proj-1", createdAt },
  ],
};

// Regression: the boards were loaded with `include: { Board: true }` but
// dropped by toDomain, so every project card showed "0 boards".
describe("PrismaProjectRepository", () => {
  it("keeps the project's boards in findByUser", async () => {
    const findMany = vi.fn().mockResolvedValue([projectRow]);
    const repository = new PrismaProjectRepository({
      project: { findMany },
    } as unknown as PrismaClient);

    const [project] = await repository.findByUser("user-1");

    expect(project?.boards).toEqual([
      new Board("board-1", "Design", "proj-1", createdAt),
      new Board("board-2", "Dev", "proj-1", createdAt),
    ]);
  });

  it("keeps the project's boards in findById", async () => {
    const findUnique = vi.fn().mockResolvedValue(projectRow);
    const repository = new PrismaProjectRepository({
      project: { findUnique },
    } as unknown as PrismaClient);

    const project = await repository.findById("proj-1");

    expect(project?.boards).toHaveLength(2);
  });
});
