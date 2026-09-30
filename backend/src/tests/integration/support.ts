import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { RabbitMqConnection } from "../../shared/events/rabbitmq/RabbitMqConnection.js";
import {
  RabbitMqEventBus,
  type RetryPolicy,
} from "../../shared/events/rabbitmq/RabbitMqEventBus.js";
import { defaultTopology } from "../../shared/events/rabbitmq/topology.js";
import type { EventLogger } from "../../shared/events/eventLogger.js";
import { integrationEnv } from "./env.js";

export function createTestPrisma(): PrismaClient {
  const { databaseUrl } = integrationEnv();
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Notification", "Task", "Board", "ProjectMember", "Project", "User" CASCADE',
  );
}

export async function seedProject(prisma: PrismaClient) {
  const [alice, bob, carol] = await Promise.all(
    ["Alice", "Bob", "Carol"].map((name) =>
      prisma.user.create({
        data: {
          name,
          email: `${name.toLowerCase()}@integration.test`,
          passwordHash: "not-a-real-hash",
        },
      }),
    ),
  );
  // Alice owns the project, Bob is a member, Carol is an outsider.
  const project = await prisma.project.create({
    data: { name: "Integration", description: "", ownerId: alice!.id },
  });
  await prisma.projectMember.create({
    data: { projectId: project.id, userId: bob!.id },
  });
  return { alice: alice!, bob: bob!, carol: carol!, project };
}

const quietLogger: EventLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

export function connectEventBus(
  retryPolicy: RetryPolicy = { maxRetries: 1, delayMs: 300 },
  logger: EventLogger = quietLogger,
) {
  const { rabbitMqUrl } = integrationEnv();
  const connection = new RabbitMqConnection(
    { url: rabbitMqUrl, safeUrl: "(integration broker)", prefetch: 10 },
    {
      topology: defaultTopology,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    },
  );
  const bus = new RabbitMqEventBus(connection, logger, retryPolicy);
  return {
    connection,
    bus,
    async start() {
      await connection.start();
      if (!connection.isConnected()) {
        throw new Error(
          `RabbitMQ unreachable: ${connection.status().lastError ?? "unknown"}`,
        );
      }
    },
  };
}

// Polls until `check` returns a truthy value or the timeout expires.
export async function waitFor<T>(
  check: () => Promise<T>,
  { timeoutMs = 10_000, label = "condition" } = {},
): Promise<NonNullable<T>> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > deadline)
      throw new Error(`Timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// Unique per run, so test consumers never share queues across runs.
export const runId = Math.random().toString(36).slice(2, 8);
