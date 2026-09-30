import type { PrismaClient } from "../../generated/prisma/client.js";
import type { LegacyTodoArchive, LegacyTodoItem } from "./LegacyTodo.js";

export class PrismaLegacyTodoArchive implements LegacyTodoArchive {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertMany(items: LegacyTodoItem[]): Promise<void> {
    // One transaction per batch: a failing batch leaves no partial write,
    // and re-running the script resumes safely thanks to the upsert.
    await this.prisma.$transaction(
      items.map(({ id, ...data }) =>
        this.prisma.legacyTodoItem.upsert({
          where: { id },
          create: { id, ...data },
          update: { ...data, migratedAt: new Date() },
        }),
      ),
    );
  }

  countExisting(ids: string[]): Promise<number> {
    return this.prisma.legacyTodoItem.count({ where: { id: { in: ids } } });
  }
}
