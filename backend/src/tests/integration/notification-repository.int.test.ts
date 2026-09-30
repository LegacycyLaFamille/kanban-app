import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Notification } from "../../modules/notifications/Notification.js";
import { InvalidNotificationCursorError } from "../../modules/notifications/NotificationRepository.js";
import { PrismaNotificationRepository } from "../../modules/notifications/PrismaNotificationRepository.js";
import { createTestPrisma, resetDatabase, seedProject } from "./support.js";

// PrismaNotificationRepository against a real PostgreSQL: unique index,
// ordering, cursor pagination and scoping by user.
describe("PrismaNotificationRepository (PostgreSQL réel)", () => {
  const prisma = createTestPrisma();
  const repository = new PrismaNotificationRepository(prisma);
  let seed: Awaited<ReturnType<typeof seedProject>>;

  const notification = (
    userId: string,
    createdAt: Date,
    eventId: string = randomUUID(),
  ) =>
    new Notification(
      randomUUID(),
      userId,
      "task.completed",
      eventId,
      seed.alice.id,
      seed.project.id,
      randomUUID(),
      "Tâche",
      null,
      createdAt,
    );

  beforeEach(async () => {
    await resetDatabase(prisma);
    seed = await seedProject(prisma);
  });

  afterAll(() => prisma.$disconnect());

  it("ignore les doublons (eventId, userId) grâce à l'index unique", async () => {
    const eventId = randomUUID();
    const at = new Date();

    expect(
      await repository.createMany([notification(seed.bob.id, at, eventId)]),
    ).toBe(1);
    expect(
      await repository.createMany([
        notification(seed.bob.id, at, eventId),
        notification(seed.carol.id, at, eventId),
      ]),
    ).toBe(1);
    expect(await prisma.notification.count()).toBe(2);
  });

  it("pagine sans trou ni doublon, y compris à date égale", async () => {
    const sameTime = new Date("2026-09-30T10:00:00.000Z");
    const rows = [
      ...[1, 2, 3].map(() => notification(seed.bob.id, sameTime)),
      notification(seed.bob.id, new Date("2026-09-30T11:00:00.000Z")),
      notification(seed.bob.id, new Date("2026-09-30T09:00:00.000Z")),
    ];
    await repository.createMany(rows);

    const seen: string[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await repository.findForUser(seed.bob.id, {
        unreadOnly: false,
        limit: 2,
        ...(cursor ? { cursor } : {}),
      });
      if (page.length === 0) break;
      seen.push(...page.map((n) => n.id));
      cursor = page[page.length - 1]!.id;
    }

    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
    expect(seen[0]).toBe(rows[3]!.id);
    expect(seen[4]).toBe(rows[4]!.id);
  });

  it("résout le nom du projet et de l'auteur, null si l'auteur est supprimé", async () => {
    await repository.createMany([notification(seed.bob.id, new Date())]);

    const [view] = await repository.findForUser(seed.bob.id, {
      unreadOnly: false,
      limit: 10,
    });
    expect(view).toMatchObject({
      project: { id: seed.project.id, name: "Integration" },
      actor: { id: seed.alice.id, name: "Alice" },
    });

    // Deleting Alice deletes her project (cascade), so use a member as actor.
    await prisma.notification.updateMany({ data: { actorId: seed.carol.id } });
    await prisma.user.delete({ where: { id: seed.carol.id } });
    const [orphan] = await repository.findForUser(seed.bob.id, {
      unreadOnly: false,
      limit: 10,
    });
    expect(orphan?.actor).toBeNull();
  });

  it("refuse le curseur d'un autre utilisateur", async () => {
    const carols = notification(seed.carol.id, new Date());
    await repository.createMany([carols]);

    await expect(
      repository.findForUser(seed.bob.id, {
        unreadOnly: false,
        limit: 10,
        cursor: carols.id,
      }),
    ).rejects.toThrow(InvalidNotificationCursorError);
  });

  it("markRead est limité à l'utilisateur et garde la première date", async () => {
    const bobs = notification(seed.bob.id, new Date());
    await repository.createMany([bobs]);
    const first = new Date("2026-09-30T12:00:00.000Z");

    expect(await repository.markRead(bobs.id, seed.carol.id, first)).toBeNull();
    expect(
      (await repository.markRead(bobs.id, seed.bob.id, first))?.readAt,
    ).toEqual(first);
    expect(
      (await repository.markRead(bobs.id, seed.bob.id, new Date()))?.readAt,
    ).toEqual(first);
    expect(await repository.countUnread(seed.bob.id)).toBe(0);
  });

  it("markAllRead ne touche que l'utilisateur", async () => {
    await repository.createMany([
      notification(seed.bob.id, new Date()),
      notification(seed.bob.id, new Date()),
      notification(seed.carol.id, new Date()),
    ]);

    expect(await repository.markAllRead(seed.bob.id, new Date())).toBe(2);
    expect(await repository.countUnread(seed.carol.id)).toBe(1);
  });

  it("supprime les notifications avec le projet", async () => {
    await repository.createMany([notification(seed.bob.id, new Date())]);

    await prisma.project.delete({ where: { id: seed.project.id } });

    expect(await prisma.notification.count()).toBe(0);
  });
});
