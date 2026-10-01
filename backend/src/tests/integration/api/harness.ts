import type { Express } from "express";
import request from "supertest";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import { integrationDatabaseUrl } from "../env.js";
import { createTestPrisma, runId } from "../support.js";

// API integration tests: the real Express app (routing, middlewares,
// services, Prisma repositories) on the dedicated _test database. No
// message broker: events are dropped by publishSafely, the event workflow
// has its own suite (notification-workflow.int.test.ts).

export const PASSWORD = "Integration-Password-1";

let app: Express | null = null;

/**
 * Loads the app once per test file. Environment variables are set before
 * the first import, since modules read them when loaded.
 */
export async function loadApp(): Promise<Express> {
  if (app) return app;

  process.env.DATABASE_URL = integrationDatabaseUrl();
  // shared/database/prisma.ts appends "_test" to the URL when NODE_ENV is
  // "test" (Vitest's default); the URL already names the test database.
  process.env.NODE_ENV = "integration";
  process.env.JWT_SECRET ??= "integration-tests-secret";
  // Empty values: dotenv never overrides them with backend/.env.
  process.env.RABBITMQ_URL = "";
  process.env.RABBITMQ_HOST = "";
  process.env.OTEL_SDK_DISABLED = "true";
  process.env.LOG_LEVEL = "silent";
  process.env.RATE_LIMIT_DISABLED = "true";
  process.env.GRAFANA_URL = "";

  ({ app } = await import("../../../app.js"));
  return app;
}

export function testPrisma(): PrismaClient {
  return createTestPrisma();
}

export type Agent = ReturnType<typeof request.agent>;

export interface SignedInUser {
  id: string;
  email: string;
  name: string;
  // Keeps the session cookies between requests, like a browser.
  agent: Agent;
}

export async function register(
  app: Express,
  name: string,
  email = `${name.toLowerCase()}-${runId}@integration.test`,
): Promise<{ id: string; email: string; name: string }> {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ name, email, password: PASSWORD });
  if (res.status !== 201) {
    throw new Error(`register ${email}: ${res.status} ${res.text}`);
  }
  return res.body.user;
}

export async function signIn(
  app: Express,
  email: string,
  password = PASSWORD,
): Promise<Agent> {
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login ${email}: ${res.status} ${res.text}`);
  }
  return agent;
}

export async function signUp(
  app: Express,
  name: string,
): Promise<SignedInUser> {
  const user = await register(app, name);
  return { ...user, agent: await signIn(app, user.email) };
}

/** Value of a cookie set by a response, or undefined. */
export function cookie(
  res: { headers: Record<string, unknown> },
  name: string,
): string | undefined {
  const header = res.headers["set-cookie"];
  const cookies = Array.isArray(header) ? (header as string[]) : [];
  const line = cookies.find((value) => value.startsWith(`${name}=`));
  return line?.slice(name.length + 1).split(";")[0];
}

export function setCookieLine(
  res: { headers: Record<string, unknown> },
  name: string,
): string | undefined {
  const header = res.headers["set-cookie"];
  const cookies = Array.isArray(header) ? (header as string[]) : [];
  return cookies.find((value) => value.startsWith(`${name}=`));
}
