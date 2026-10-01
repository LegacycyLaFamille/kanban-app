import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import amqp from "amqplib";
import { createEvent } from "../../shared/events/DomainEvent.js";
import { DEAD_LETTER_QUEUE } from "../../shared/events/rabbitmq/topology.js";
import {
  FAILED_CONSUMER_HEADER,
  RETRY_COUNT_HEADER,
} from "../../shared/events/rabbitmq/RabbitMqEventBus.js";
import { ProjectAccessGuard } from "../../shared/security/ProjectAccessGuard.js";
import { TaskService } from "../../modules/tasks/TaskService.js";
import { PrismaTaskRepository } from "../../modules/tasks/PrismaTaskRepository.js";
import { PrismaBoardRepository } from "../../modules/boards/PrismaBoardRepository.js";
import { PrismaProjectRepository } from "../../modules/projects/PrismaProjectRepository.js";
import { PrismaProjectMemberRepository } from "../../modules/projects/PrismaProjectMemberRepository.js";
import { NotificationService } from "../../modules/notifications/NotificationService.js";
import { PrismaNotificationRepository } from "../../modules/notifications/PrismaNotificationRepository.js";
import {
  NOTIFICATION_CONSUMER,
  subscribeNotificationConsumer,
} from "../../modules/notifications/notification.consumer.js";
import type { TaskCompletedEvent } from "../../modules/tasks/task.events.js";
import { integrationEnv } from "./env.js";
import {
  connectEventBus,
  createTestPrisma,
  resetDatabase,
  runId,
  seedProject,
  waitFor,
} from "./support.js";

// S2-31: task change → RabbitMQ → notification consumer → PostgreSQL, with
// the production classes and real infrastructure.
describe("Workflow notifications (PostgreSQL + RabbitMQ réels)", () => {
  const prisma = createTestPrisma();
  const broker = connectEventBus();
  let admin: amqp.ChannelModel;
  let adminChannel: amqp.Channel;
  let seed: Awaited<ReturnType<typeof seedProject>>;
  let taskService: TaskService;

  const notificationsOf = (userId: string) =>
    prisma.notification.findMany({
      where: { userId },
      orderBy: { type: "asc" },
    });

  beforeAll(async () => {
    admin = await amqp.connect(integrationEnv().rabbitMqUrl);
    adminChannel = await admin.createChannel();

    const projects = new PrismaProjectRepository(prisma);
    const members = new PrismaProjectMemberRepository(prisma);
    await subscribeNotificationConsumer(
      broker.bus,
      new NotificationService(
        new PrismaNotificationRepository(prisma),
        projects,
        members,
      ),
      () => {},
    );
    await broker.start();
    // Leftovers from an interrupted run must not leak into assertions.
    await adminChannel.purgeQueue(NOTIFICATION_CONSUMER);
    await adminChannel.purgeQueue(DEAD_LETTER_QUEUE);

    taskService = new TaskService(
      new PrismaTaskRepository(prisma),
      new ProjectAccessGuard(projects, members),
      broker.bus,
      new PrismaBoardRepository(prisma),
    );
  });

  afterAll(async () => {
    await broker.connection.close();
    await admin.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    seed = await seedProject(prisma);
  });

  it("la création d'une tâche publie task.created et notifie les membres", async () => {
    const task = await taskService.create(seed.project.id, seed.alice.id, {
      title: "Écrire la doc ☕",
      description: "",
      priority: "High",
      status: "TODO",
    });

    const [notification] = await waitFor(
      async () => {
        const rows = await notificationsOf(seed.bob.id);
        return rows.length > 0 ? rows : null;
      },
      { label: "notification de Bob" },
    );
    expect(notification).toMatchObject({
      type: "task.created",
      actorId: seed.alice.id,
      projectId: seed.project.id,
      taskId: task.id,
      taskTitle: "Écrire la doc ☕",
      readAt: null,
    });
    // The actor and non-members are never notified.
    expect(await notificationsOf(seed.alice.id)).toHaveLength(0);
    expect(await notificationsOf(seed.carol.id)).toHaveLength(0);
  });

  it("le passage à DONE notifie task.completed, une mise à jour sans changement ne notifie rien", async () => {
    const task = await taskService.create(seed.project.id, seed.alice.id, {
      title: "Livrer",
      description: "",
      priority: "Medium",
      status: "IN_PROGRESS",
    });
    await taskService.update(task.id, seed.alice.id, { status: "DONE" });
    await taskService.update(task.id, seed.alice.id, { status: "DONE" });

    const rows = await waitFor(
      async () => {
        const all = await notificationsOf(seed.bob.id);
        return all.length >= 2 ? all : null;
      },
      { label: "deux notifications" },
    );
    expect(rows.map((n) => n.type)).toEqual(["task.completed", "task.created"]);

    // Give the broker time to deliver anything unexpected.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await notificationsOf(seed.bob.id)).toHaveLength(2);
  });

  it("une double livraison du même événement ne crée pas de doublon", async () => {
    const event: TaskCompletedEvent = createEvent(
      "task.completed",
      {
        taskId: "00000000-0000-4000-8000-000000000001",
        projectId: seed.project.id,
        title: "Dupliquée",
        previousStatus: "TODO",
      },
      { actorId: seed.alice.id },
    );

    await broker.bus.publish(event);
    await broker.bus.publish(event);

    await waitFor(async () => (await notificationsOf(seed.bob.id)).length > 0, {
      label: "notification",
    });
    await waitFor(
      async () =>
        (await adminChannel.checkQueue(NOTIFICATION_CONSUMER)).messageCount ===
        0,
      { label: "queue vidée" },
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(await notificationsOf(seed.bob.id)).toHaveLength(1);
  });

  it("un échec temporaire du consumer est réessayé puis réussit", async () => {
    let attempts = 0;
    // A type no production consumer listens to: a fake task.updated would
    // also reach the notification consumer and end in the dead-letter queue.
    await broker.bus.subscribe({
      name: `integration.flaky-${runId}`,
      eventTypes: ["integration.flaky"],
      handler: async () => {
        attempts++;
        if (attempts === 1) throw new Error("temporary failure");
      },
    });

    await broker.bus.publish(createEvent("integration.flaky", {}));

    await waitFor(async () => attempts >= 2, { label: "retry" });
    expect(attempts).toBe(2);
  });

  it("un échec permanent finit en dead-letter avec sa cause", async () => {
    const consumer = `integration.broken-${runId}`;
    await broker.bus.subscribe({
      name: consumer,
      eventTypes: ["project.archived"],
      handler: async () => {
        throw new Error("always failing");
      },
    });
    const event = createEvent("project.archived", {});

    await broker.bus.publish(event);

    // Skip any other dead-lettered message: only this event matters here.
    const message = await waitFor(
      async () => {
        const next = await adminChannel.get(DEAD_LETTER_QUEUE, { noAck: true });
        return next && next.properties.messageId === event.id ? next : null;
      },
      { label: "message en dead-letter" },
    );
    expect(message.properties.messageId).toBe(event.id);
    expect(message.properties.headers).toMatchObject({
      [FAILED_CONSUMER_HEADER]: consumer,
      [RETRY_COUNT_HEADER]: 1,
    });
    expect(JSON.parse(message.content.toString())).toEqual(event);
  });
});
