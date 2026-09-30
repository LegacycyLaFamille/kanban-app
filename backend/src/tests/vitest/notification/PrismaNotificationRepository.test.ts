import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import { PrismaNotificationRepository } from "../../../modules/notifications/PrismaNotificationRepository.js";
import { InvalidNotificationCursorError } from "../../../modules/notifications/NotificationRepository.js";
import { Notification } from "../../../modules/notifications/Notification.js";

// Query shapes only: the same class runs against a real PostgreSQL in
// src/tests/integration. The key property checked here is that every read
// and write is scoped to the requesting user.

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "n1",
  type: "task.completed",
  actorId: "alice",
  taskId: "t1",
  taskTitle: "Écrire la doc",
  readAt: null,
  createdAt: new Date("2026-09-30T10:00:00.000Z"),
  project: { id: "p1", name: "Kanban" },
  ...overrides,
});

describe("PrismaNotificationRepository", () => {
  let prisma: {
    notification: Record<
      "createMany" | "findFirst" | "findMany" | "count" | "updateMany",
      Mock
    >;
    user: { findMany: Mock };
  };
  let repository: PrismaNotificationRepository;

  beforeEach(() => {
    prisma = {
      notification: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(3),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([{ id: "alice", name: "Alice" }]),
      },
    };
    repository = new PrismaNotificationRepository(
      prisma as unknown as PrismaClient,
    );
  });

  describe("createMany", () => {
    it("insère avec skipDuplicates et renvoie le nombre inséré", async () => {
      const n = new Notification(
        "n1",
        "bob",
        "task.created",
        "e1",
        "alice",
        "p1",
        "t1",
        "Titre",
        null,
        new Date(),
      );

      await expect(repository.createMany([n])).resolves.toBe(1);
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ id: "n1", userId: "bob", eventId: "e1" }),
        ],
        skipDuplicates: true,
      });
    });

    it("ne fait aucune requête pour une liste vide", async () => {
      await expect(repository.createMany([])).resolves.toBe(0);
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe("findForUser", () => {
    it("filtre par utilisateur, trie du plus récent au plus ancien et limite", async () => {
      await repository.findForUser("bob", { unreadOnly: false, limit: 21 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "bob" },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 21,
        }),
      );
    });

    it("filtre les non lues", async () => {
      await repository.findForUser("bob", { unreadOnly: true, limit: 5 });

      expect(prisma.notification.findMany.mock.calls[0]![0].where).toEqual({
        userId: "bob",
        readAt: null,
      });
    });

    it("cherche le curseur parmi les notifications de l'utilisateur et repart après lui", async () => {
      const cursorDate = new Date("2026-09-30T09:00:00.000Z");
      prisma.notification.findFirst.mockResolvedValue({
        id: "n5",
        createdAt: cursorDate,
      });

      await repository.findForUser("bob", {
        unreadOnly: false,
        limit: 5,
        cursor: "n5",
      });

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: "n5", userId: "bob" },
        select: { createdAt: true, id: true },
      });
      expect(prisma.notification.findMany.mock.calls[0]![0].where).toEqual({
        userId: "bob",
        OR: [
          { createdAt: { lt: cursorDate } },
          { createdAt: cursorDate, id: { lt: "n5" } },
        ],
      });
    });

    it("refuse un curseur qui n'appartient pas à l'utilisateur", async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        repository.findForUser("bob", {
          unreadOnly: false,
          limit: 5,
          cursor: "n-of-carol",
        }),
      ).rejects.toThrow(InvalidNotificationCursorError);
      expect(prisma.notification.findMany).not.toHaveBeenCalled();
    });

    it("résout les auteurs en une requête et met null pour un auteur supprimé", async () => {
      prisma.notification.findMany.mockResolvedValue([
        row({ id: "n1", actorId: "alice" }),
        row({ id: "n2", actorId: "alice" }),
        row({ id: "n3", actorId: "deleted-user" }),
        row({ id: "n4", actorId: null, taskId: null }),
      ]);

      const views = await repository.findForUser("bob", {
        unreadOnly: false,
        limit: 10,
      });

      expect(prisma.user.findMany).toHaveBeenCalledOnce();
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["alice", "deleted-user"] } },
        select: { id: true, name: true },
      });
      expect(views.map((v) => v.actor)).toEqual([
        { id: "alice", name: "Alice" },
        { id: "alice", name: "Alice" },
        null,
        null,
      ]);
      expect(views[0]).toEqual({
        id: "n1",
        type: "task.completed",
        readAt: null,
        createdAt: new Date("2026-09-30T10:00:00.000Z"),
        project: { id: "p1", name: "Kanban" },
        task: { id: "t1", title: "Écrire la doc" },
        actor: { id: "alice", name: "Alice" },
      });
      expect(views[3]?.task).toBeNull();
    });

    it("ne cherche pas d'auteurs quand aucun n'est référencé", async () => {
      prisma.notification.findMany.mockResolvedValue([row({ actorId: null })]);

      await repository.findForUser("bob", { unreadOnly: false, limit: 10 });

      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  it("countUnread compte les non lues de l'utilisateur", async () => {
    await expect(repository.countUnread("bob")).resolves.toBe(3);
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: "bob", readAt: null },
    });
  });

  describe("markRead", () => {
    it("ne met à jour que la notification non lue de l'utilisateur", async () => {
      const readAt = new Date();
      prisma.notification.findFirst.mockResolvedValue(row({ readAt }));

      const view = await repository.markRead("n1", "bob", readAt);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: "n1", userId: "bob", readAt: null },
        data: { readAt },
      });
      expect(prisma.notification.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "n1", userId: "bob" } }),
      );
      expect(view?.readAt).toBe(readAt);
    });

    it("renvoie null pour la notification d'un autre utilisateur", async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        repository.markRead("n1", "carol", new Date()),
      ).resolves.toBeNull();
    });
  });

  it("markAllRead ne met à jour que les non lues de l'utilisateur", async () => {
    const readAt = new Date();

    await expect(repository.markAllRead("bob", readAt)).resolves.toBe(2);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "bob", readAt: null },
      data: { readAt },
    });
  });
});
