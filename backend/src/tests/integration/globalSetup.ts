import { execSync } from "node:child_process";
import { integrationEnv } from "./env.js";

// Brings the test database to the latest schema before any test runs.
export default function setup(): void {
  const { databaseUrl } = integrationEnv();
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
