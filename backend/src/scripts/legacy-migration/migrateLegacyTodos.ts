import type {
  LegacyTodoArchive,
  LegacyTodoItem,
  LegacyTodoRow,
  LegacyTodoSource,
} from "./LegacyTodo.js";

export interface MigrationOptions {
  dryRun: boolean;
  batchSize: number;
  log?: (message: string) => void;
}

export interface MigrationReport {
  read: number;
  valid: number;
  skippedWithoutId: number;
  duplicateIds: string[];
  written: number;
  verified: number;
  dryRun: boolean;
}

export class LegacyMigrationError extends Error {}

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = String(value).trim();
  return id === "" ? null : id;
}

function normalizeName(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
}

// Same rule as the legacy persistence layer: only `1` means completed.
function normalizeCompleted(value: unknown): boolean {
  return value === 1 || value === true;
}

export function normalizeLegacyRows(
  rows: LegacyTodoRow[],
  source: LegacyTodoItem["source"],
): {
  items: LegacyTodoItem[];
  skippedWithoutId: number;
  duplicateIds: string[];
} {
  const byId = new Map<string, LegacyTodoItem>();
  const duplicateIds = new Set<string>();
  let skippedWithoutId = 0;

  for (const row of rows) {
    const id = normalizeId(row.id);
    if (id === null) {
      skippedWithoutId++;
      continue;
    }
    // The legacy table has no primary key. Its `getItem` returned the first
    // matching row, so the first occurrence wins here too.
    if (byId.has(id)) {
      duplicateIds.add(id);
      continue;
    }
    byId.set(id, {
      id,
      name: normalizeName(row.name),
      completed: normalizeCompleted(row.completed),
      source,
    });
  }

  return {
    items: [...byId.values()],
    skippedWithoutId,
    duplicateIds: [...duplicateIds],
  };
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

export async function migrateLegacyTodos(
  source: LegacyTodoSource,
  archive: LegacyTodoArchive,
  { dryRun, batchSize, log = () => {} }: MigrationOptions,
): Promise<MigrationReport> {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new LegacyMigrationError("batchSize must be a positive integer");
  }

  log(`Reading legacy todo_items from ${source.kind} (${source.location})`);
  const rows = await source.readAll();
  const { items, skippedWithoutId, duplicateIds } = normalizeLegacyRows(
    rows,
    source.kind,
  );

  log(
    `Read ${rows.length} row(s): ${items.length} valid, ` +
      `${skippedWithoutId} without id, ${duplicateIds.length} duplicate id(s)`,
  );

  const report: MigrationReport = {
    read: rows.length,
    valid: items.length,
    skippedWithoutId,
    duplicateIds,
    written: 0,
    verified: 0,
    dryRun,
  };

  if (dryRun) {
    log("Dry run: nothing written to PostgreSQL");
    return report;
  }

  for (const batch of chunk(items, batchSize)) {
    await archive.upsertMany(batch);
    report.written += batch.length;
    log(`Upserted ${report.written}/${items.length}`);
  }

  for (const batch of chunk(items, batchSize)) {
    report.verified += await archive.countExisting(batch.map((i) => i.id));
  }

  if (report.verified !== items.length) {
    throw new LegacyMigrationError(
      `Verification failed: ${report.verified}/${items.length} legacy ` +
        "item(s) found in PostgreSQL after migration",
    );
  }

  return report;
}
