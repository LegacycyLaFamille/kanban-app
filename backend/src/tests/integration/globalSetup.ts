import { execFileSync } from "node:child_process";
import path from "node:path";
import { integrationDatabaseUrl } from "./env.js";

// Brings the test database to the latest schema before any test runs. The
// Prisma CLI is run with the current Node binary and an absolute path, so
// the result does not depend on PATH.
export default function setup(): void {
  const databaseUrl = integrationDatabaseUrl();
  const prismaCli = path.resolve("node_modules/prisma/build/index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
