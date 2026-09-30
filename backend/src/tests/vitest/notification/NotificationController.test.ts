import { describe, it, expect, beforeEach, vi } from "vitest";
import express, {
  type Express,
  type NextFunction,
  type Request,
} from "express";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { NotificationController } from "../../../modules/notifications/NotificationController.js";
import { NotificationService } from "../../../modules/notifications/NotificationService.js";
import { Notification } from "../../../modules/notifications/Notification.js";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../../../modules/projects/ProjectMemberRepository.js";
import { InMemoryNotificationRepository } from "./InMemoryNotificationRepository.js";

const ALICE = "alice-id";
const BOB = "bob-id";

// Same routes as notification.routes.ts, with the user taken from a header
// instead of the JWT cookie.
function buildApp(repository: InMemoryNotificationRepository): Express {
  const controller = new NotificationController(
    new NotificationService(
      repository,
      {} as ProjectRepository,
      {} as ProjectMemberRepository,
    ),
  );
  const fakeAuth = (req: Request, _res: unknown, next: NextFunction) => {
    req.userId = req.header("x-user") ?? "";
    next();
  };
  const app = express();
  app.get("/notifications", fakeAuth, (req, res) => controller.list(req, res));
  app.get("/notifications/unread-count", fakeAuth, (req, res) =>
    controller.unreadCount(req, res),
  );
  app.post("/notifications/read-all", fakeAuth, (req, res) =>
    controller.markAllRead(req, res),
  );
  app.patch(
    "/notifications/:notificationId/read",
    fakeAuth,
    (req: Request<{ notificationId: string }>, res) =>
      controller.markRead(req, res),
  );
  return app;
}

function notification(
  userId: string,
  minutesAgo: number,
  overrides: Partial<{ readAt: Date | null; type: string }> = {},
) {
  return new Notification(
    randomUUID(),
    userId,
    overrides.type ?? "task.completed",
    randomUUID(),
    ALICE,
    "proj-1",
    "task-1",
    "Écrire la doc",
    overrides.readAt ?? null,
    new Date(Date.UTC(2026, 8, 30, 12, 0) - minutesAgo * 60_000),
  );
}

describe("Notifications API", () => {
  let repository: InMemoryNotificationRepository;
  let app: Express;
  let bobNotifications: Notification[];
  let aliceNotification: Notification;

  beforeEach(async () => {
    repository = new InMemoryNotificationRepository(
      { "proj-1": "Kanban" },
      { [ALICE]: "Alice" },
    );
    bobNotifications = [1, 2, 3, 4, 5].map((m) => notification(BOB, m));
    aliceNotification = notification(ALICE, 1);
    await repository.createMany([...bobNotifications, aliceNotification]);
    app = buildApp(repository);
  });

  describe("GET /notifications", () => {
    it("liste uniquement les notifications de l'utilisateur, les plus récentes d'abord", async () => {
      const res = await request(app).get("/notifications").set("x-user", BOB);

      expect(res.status).toBe(200);
      expect(res.body.items.map((n: { id: string }) => n.id)).toEqual(
        bobNotifications.map((n) => n.id),
      );
      expect(res.body.nextCursor).toBeNull();
      expect(JSON.stringify(res.body)).not.toContain(aliceNotification.id);
    });

    it("renvoie les données d'affichage (projet, tâche, auteur)", async () => {
      const res = await request(app)
        .get("/notifications?limit=1")
        .set("x-user", BOB);

      expect(res.body.items[0]).toEqual({
        id: bobNotifications[0]!.id,
        type: "task.completed",
        readAt: null,
        createdAt: bobNotifications[0]!.createdAt.toISOString(),
        project: { id: "proj-1", name: "Kanban" },
        task: { id: "task-1", title: "Écrire la doc" },
        actor: { id: ALICE, name: "Alice" },
      });
    });

    it("pagine avec un curseur jusqu'à la dernière page", async () => {
      const first = await request(app)
        .get("/notifications?limit=2")
        .set("x-user", BOB);
      const second = await request(app)
        .get(`/notifications?limit=2&cursor=${first.body.nextCursor}`)
        .set("x-user", BOB);
      const last = await request(app)
        .get(`/notifications?limit=2&cursor=${second.body.nextCursor}`)
        .set("x-user", BOB);

      const ids = [first, second, last].flatMap((r) =>
        r.body.items.map((n: { id: string }) => n.id),
      );
      expect(ids).toEqual(bobNotifications.map((n) => n.id));
      expect(last.body.nextCursor).toBeNull();
    });

    it("filtre les non lues", async () => {
      await repository.markRead(bobNotifications[0]!.id, BOB, new Date());

      const res = await request(app)
        .get("/notifications?unread=true")
        .set("x-user", BOB);

      expect(res.body.items).toHaveLength(4);
      expect(
        res.body.items.every((n: { readAt: unknown }) => n.readAt === null),
      ).toBe(true);
    });

    it("refuse le curseur d'un autre utilisateur", async () => {
      const res = await request(app)
        .get(`/notifications?cursor=${aliceNotification.id}`)
        .set("x-user", BOB);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_CURSOR");
    });

    it.each([
      ["limit=0", "limit"],
      ["limit=101", "limit"],
      ["limit=abc", "limit"],
      ["unread=yes", "unread"],
      ["cursor=not-a-uuid", "cursor"],
    ])("valide la query %s", async (query, field) => {
      const res = await request(app)
        .get(`/notifications?${query}`)
        .set("x-user", BOB);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details).toHaveProperty(field);
    });

    it("refuse les paramètres inconnus", async () => {
      const res = await request(app)
        .get("/notifications?userId=alice-id")
        .set("x-user", BOB);

      expect(res.status).toBe(400);
    });
  });

  describe("GET /notifications/unread-count", () => {
    it("compte uniquement les non lues de l'utilisateur", async () => {
      await repository.markRead(bobNotifications[0]!.id, BOB, new Date());

      const res = await request(app)
        .get("/notifications/unread-count")
        .set("x-user", BOB);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 4 });
    });
  });

  describe("PATCH /notifications/:id/read", () => {
    it("marque sa notification comme lue", async () => {
      const id = bobNotifications[0]!.id;

      const res = await request(app)
        .patch(`/notifications/${id}/read`)
        .set("x-user", BOB);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body.readAt).not.toBeNull();
    });

    it("est idempotent et garde la première date de lecture", async () => {
      const id = bobNotifications[0]!.id;
      const first = await request(app)
        .patch(`/notifications/${id}/read`)
        .set("x-user", BOB);
      vi.useFakeTimers({ now: Date.now() + 60_000 });

      const second = await request(app)
        .patch(`/notifications/${id}/read`)
        .set("x-user", BOB);
      vi.useRealTimers();

      expect(second.status).toBe(200);
      expect(second.body.readAt).toBe(first.body.readAt);
    });

    it("renvoie 404 pour la notification d'un autre utilisateur, sans la modifier", async () => {
      const res = await request(app)
        .patch(`/notifications/${aliceNotification.id}/read`)
        .set("x-user", BOB);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOTIFICATION_NOT_FOUND");
      expect(
        repository.rows.find((r) => r.id === aliceNotification.id)?.readAt,
      ).toBeNull();
    });

    it("renvoie 404 pour un id inexistant ou mal formé", async () => {
      for (const id of [randomUUID(), "not-a-uuid"]) {
        const res = await request(app)
          .patch(`/notifications/${id}/read`)
          .set("x-user", BOB);
        expect(res.status).toBe(404);
      }
    });
  });

  describe("POST /notifications/read-all", () => {
    it("marque toutes ses notifications comme lues, pas celles des autres", async () => {
      const res = await request(app)
        .post("/notifications/read-all")
        .set("x-user", BOB);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ updated: 5 });
      expect(await repository.countUnread(BOB)).toBe(0);
      expect(await repository.countUnread(ALICE)).toBe(1);
    });

    it("renvoie 0 quand tout est déjà lu", async () => {
      await request(app).post("/notifications/read-all").set("x-user", BOB);

      const res = await request(app)
        .post("/notifications/read-all")
        .set("x-user", BOB);

      expect(res.body).toEqual({ updated: 0 });
    });
  });

  describe("erreurs inattendues", () => {
    it.each([
      ["get", "/notifications"],
      ["get", "/notifications/unread-count"],
      ["patch", `/notifications/${randomUUID()}/read`],
      ["post", "/notifications/read-all"],
    ] as const)("%s %s répond 500 sans détail interne", async (method, url) => {
      const broken = new InMemoryNotificationRepository();
      for (const name of [
        "findForUser",
        "countUnread",
        "markRead",
        "markAllRead",
      ] as const) {
        vi.spyOn(broken, name).mockRejectedValue(
          new Error("db password=secret"),
        );
      }
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await request(buildApp(broken))
        [method](url)
        .set("x-user", BOB);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
        },
      });
      expect(JSON.stringify(res.body)).not.toContain("secret");
      expect(errors).toHaveBeenCalled();
      errors.mockRestore();
    });
  });
});
