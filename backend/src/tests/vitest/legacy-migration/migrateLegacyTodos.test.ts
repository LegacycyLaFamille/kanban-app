import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  LegacyMigrationError,
  migrateLegacyTodos,
  normalizeLegacyRows,
} from "../../../scripts/legacy-migration/migrateLegacyTodos.js";
import type {
  LegacyTodoArchive,
  LegacyTodoItem,
  LegacyTodoRow,
  LegacyTodoSource,
} from "../../../scripts/legacy-migration/LegacyTodo.js";

function fakeSource(rows: LegacyTodoRow[]): LegacyTodoSource {
  return {
    kind: "mysql",
    location: "legacy-db:3306/todos",
    readAll: vi.fn().mockResolvedValue(rows),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function inMemoryArchive() {
  const stored = new Map<string, LegacyTodoItem>();
  const archive = {
    upsertMany: vi.fn(async (items: LegacyTodoItem[]) => {
      for (const item of items) stored.set(item.id, item);
    }),
    countExisting: vi.fn(
      async (ids: string[]) => ids.filter((id) => stored.has(id)).length,
    ),
  } satisfies LegacyTodoArchive;
  return { archive, stored };
}

describe("normalizeLegacyRows", () => {
  it("convertit completed selon la règle legacy (seul 1 vaut true)", () => {
    const { items } = normalizeLegacyRows(
      [
        { id: "a", name: "done", completed: 1 },
        { id: "b", name: "todo", completed: 0 },
        { id: "c", name: "null", completed: null },
        { id: "d", name: "bool", completed: true },
      ],
      "sqlite",
    );

    expect(items.map((i) => i.completed)).toEqual([true, false, false, true]);
    expect(items.every((i) => i.source === "sqlite")).toBe(true);
  });

  it("ignore les lignes sans id et garde la première occurrence d'un doublon", () => {
    const result = normalizeLegacyRows(
      [
        { id: null, name: "orphan", completed: 0 },
        { id: "  ", name: "blank", completed: 0 },
        { id: "a", name: "first", completed: 0 },
        { id: "a", name: "second", completed: 1 },
      ],
      "mysql",
    );

    expect(result.skippedWithoutId).toBe(2);
    expect(result.duplicateIds).toEqual(["a"]);
    expect(result.items).toEqual([
      { id: "a", name: "first", completed: false, source: "mysql" },
    ]);
  });

  it("conserve un nom nul et les caractères accentués", () => {
    const { items } = normalizeLegacyRows(
      [
        { id: "a", name: null, completed: 0 },
        { id: "b", name: "Café Ünïcode", completed: 0 },
      ],
      "mysql",
    );

    expect(items.map((i) => i.name)).toEqual([null, "Café Ünïcode"]);
  });
});

describe("migrateLegacyTodos", () => {
  let rows: LegacyTodoRow[];

  beforeEach(() => {
    rows = Array.from({ length: 5 }, (_, i) => ({
      id: `id-${i}`,
      name: `todo ${i}`,
      completed: i % 2,
    }));
  });

  it("écrit par lots et vérifie le nombre de lignes migrées", async () => {
    const { archive, stored } = inMemoryArchive();

    const report = await migrateLegacyTodos(fakeSource(rows), archive, {
      dryRun: false,
      batchSize: 2,
    });

    expect(archive.upsertMany).toHaveBeenCalledTimes(3);
    expect(stored.size).toBe(5);
    expect(report).toMatchObject({
      read: 5,
      valid: 5,
      written: 5,
      verified: 5,
    });
  });

  it("est idempotent quand on le relance", async () => {
    const { archive, stored } = inMemoryArchive();
    const options = { dryRun: false, batchSize: 10 };

    await migrateLegacyTodos(fakeSource(rows), archive, options);
    const report = await migrateLegacyTodos(fakeSource(rows), archive, options);

    expect(stored.size).toBe(5);
    expect(report.verified).toBe(5);
  });

  it("n'écrit rien en dry run", async () => {
    const { archive } = inMemoryArchive();

    const report = await migrateLegacyTodos(fakeSource(rows), archive, {
      dryRun: true,
      batchSize: 10,
    });

    expect(archive.upsertMany).not.toHaveBeenCalled();
    expect(report).toMatchObject({ dryRun: true, valid: 5, written: 0 });
  });

  it("échoue si la vérification ne retrouve pas toutes les lignes", async () => {
    const { archive } = inMemoryArchive();
    archive.countExisting.mockResolvedValue(0);

    await expect(
      migrateLegacyTodos(fakeSource(rows), archive, {
        dryRun: false,
        batchSize: 10,
      }),
    ).rejects.toThrow(LegacyMigrationError);
  });

  it("refuse une taille de lot invalide", async () => {
    const { archive } = inMemoryArchive();

    await expect(
      migrateLegacyTodos(fakeSource(rows), archive, {
        dryRun: false,
        batchSize: Number("abc"),
      }),
    ).rejects.toThrow("batchSize");
  });
});
