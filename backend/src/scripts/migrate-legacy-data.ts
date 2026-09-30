// One-shot migration of the legacy `todo_items` table (MySQL or SQLite) into
// the read-only PostgreSQL archive table `LegacyTodoItem` (see ADR-007).
//
// Run after a deployment, once `prisma migrate deploy` has created the table:
//   node dist/scripts/migrate-legacy-data.js [--dry-run] [--source=mysql|sqlite]
// Full procedure: docs/backend/LEGACY_DATA_MIGRATION.md
import { parseArgs } from "node:util";
import { prisma } from "../shared/database/prisma.js";
import type {
  LegacySourceKind,
  LegacyTodoSource,
} from "./legacy-migration/LegacyTodo.js";
import {
  isMySqlConfigured,
  openMySqlSource,
  openSqliteSource,
} from "./legacy-migration/legacyTodoSources.js";
import { migrateLegacyTodos } from "./legacy-migration/migrateLegacyTodos.js";
import { PrismaLegacyTodoArchive } from "./legacy-migration/PrismaLegacyTodoArchive.js";

const USAGE = `Usage: node dist/scripts/migrate-legacy-data.js [options]

Options:
  --dry-run              Read and validate legacy data without writing
  --source=mysql|sqlite  Legacy engine (default: mysql if MYSQL_HOST is set, else sqlite)
  --sqlite-path=PATH     SQLite file (default: $SQLITE_DB_LOCATION)
  --batch-size=N         Rows per transaction (default: 500)
  -h, --help             Show this help

MySQL connection: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB
(each also accepted as MYSQL_*_FILE). Target: DATABASE_URL.`;

function parseSource(value: string | undefined): LegacySourceKind {
  if (value === undefined) return isMySqlConfigured() ? "mysql" : "sqlite";
  if (value === "mysql" || value === "sqlite") return value;
  throw new Error(`Unknown --source "${value}" (expected mysql or sqlite)`);
}

async function openSource(
  kind: LegacySourceKind,
  sqlitePath: string | undefined,
): Promise<LegacyTodoSource> {
  if (kind === "mysql") return openMySqlSource();

  const path = sqlitePath ?? process.env.SQLITE_DB_LOCATION;
  if (!path) {
    throw new Error(
      "SQLite source requires --sqlite-path or SQLITE_DB_LOCATION",
    );
  }
  return openSqliteSource(path);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      source: { type: "string" },
      "sqlite-path": { type: "string" },
      "batch-size": { type: "string", default: "500" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }

  const source = await openSource(
    parseSource(values.source),
    values["sqlite-path"],
  );

  try {
    const report = await migrateLegacyTodos(
      source,
      new PrismaLegacyTodoArchive(prisma),
      {
        dryRun: values["dry-run"],
        batchSize: Number(values["batch-size"]),
        log: (message) => console.log(`[legacy-migration] ${message}`),
      },
    );

    if (report.duplicateIds.length > 0) {
      console.warn(
        "[legacy-migration] Duplicate legacy ids (first row kept): " +
          report.duplicateIds.join(", "),
      );
    }
    console.log(`[legacy-migration] Done: ${JSON.stringify(report)}`);
  } finally {
    await source.close();
  }
}

main()
  .catch((error: unknown) => {
    console.error("[legacy-migration] Failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
