import fs from "node:fs";
import mysql from "mysql2/promise";
import sqlite3 from "sqlite3";
import type { LegacyTodoRow, LegacyTodoSource } from "./LegacyTodo.js";

const LEGACY_TABLE = "todo_items";

// Same env contract as src/legacy/persistence/mysql.js: every MYSQL_* value
// can also be given as a file path through MYSQL_*_FILE (Docker secrets).
function readEnv(name: string): string | undefined {
  const file = process.env[`${name}_FILE`];
  if (file) return fs.readFileSync(file, "utf8").trim();
  return process.env[name];
}

export function isMySqlConfigured(): boolean {
  return Boolean(process.env.MYSQL_HOST || process.env.MYSQL_HOST_FILE);
}

export async function openMySqlSource(): Promise<LegacyTodoSource> {
  const host = readEnv("MYSQL_HOST");
  const user = readEnv("MYSQL_USER");
  const password = readEnv("MYSQL_PASSWORD");
  const database = readEnv("MYSQL_DB");
  const port = Number(readEnv("MYSQL_PORT") ?? 3306);

  if (!host || !user || !database) {
    throw new Error(
      "MySQL source requires MYSQL_HOST, MYSQL_USER and MYSQL_DB " +
        "(or their *_FILE variants)",
    );
  }

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    database,
    charset: "utf8mb4",
    connectTimeout: 10_000,
    ...(password === undefined ? {} : { password }),
  });

  return {
    kind: "mysql",
    location: `${host}:${port}/${database}`,
    async readAll() {
      const [tables] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT 1 FROM information_schema.tables " +
          "WHERE table_schema = ? AND table_name = ?",
        [database, LEGACY_TABLE],
      );
      if (tables.length === 0) return [];

      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT id, name, completed FROM ${LEGACY_TABLE}`,
      );
      return rows as LegacyTodoRow[];
    },
    close: () => connection.end(),
  };
}

function sqliteAll<T>(db: sqlite3.Database, sql: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
  });
}

export async function openSqliteSource(
  path: string,
): Promise<LegacyTodoSource> {
  // Opening read-only also prevents sqlite from silently creating an empty
  // database when the path is wrong.
  if (!fs.existsSync(path)) {
    throw new Error(`SQLite legacy database not found at ${path}`);
  }

  const db = await new Promise<sqlite3.Database>((resolve, reject) => {
    const handle = new sqlite3.Database(path, sqlite3.OPEN_READONLY, (err) =>
      err ? reject(err) : resolve(handle),
    );
  });

  return {
    kind: "sqlite",
    location: path,
    async readAll() {
      const tables = await sqliteAll(
        db,
        `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '${LEGACY_TABLE}'`,
      );
      if (tables.length === 0) return [];

      return sqliteAll<LegacyTodoRow>(
        db,
        `SELECT id, name, completed FROM ${LEGACY_TABLE}`,
      );
    },
    close: () =>
      new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
