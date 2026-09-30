import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import express, { type Express, type NextFunction } from "express";
import request from "supertest";
import { AuthController } from "../../../modules/auth/AuthController.js";
import type { AuthService } from "../../../modules/auth/AuthService.js";
import { User } from "../../../modules/users/User.js";

describe("AuthController - current user", () => {
  let app: Express;
  let mockAuthService: Mocked<
    Pick<AuthService, "getUserById" | "updateProfile" | "getActivityStats">
  >;

  const createdAt = new Date("2026-09-01T10:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthService = {
      getUserById: vi.fn(),
      updateProfile: vi.fn(),
      getActivityStats: vi.fn(),
    };

    const controller = new AuthController(
      mockAuthService as unknown as AuthService,
    );

    const fakeAuth = (
      req: express.Request,
      _res: unknown,
      next: NextFunction,
    ) => {
      req.userId = "user_1";
      next();
    };

    app = express();
    app.use(express.json());
    app.get("/me", fakeAuth, controller.getProfile);
    app.patch("/me", fakeAuth, controller.updateProfile);
    app.get("/me/stats", fakeAuth, controller.getActivityStats);
  });

  describe("GET /me", () => {
    it("retourne le profil avec createdAt sans champ sensible", async () => {
      mockAuthService.getUserById.mockResolvedValue(
        new User("user_1", "me@example.com", "Me", createdAt),
      );

      const res = await request(app).get("/me");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: "user_1",
        email: "me@example.com",
        name: "Me",
        createdAt: createdAt.toISOString(),
      });
    });
  });

  describe("PATCH /me", () => {
    it("met à jour le nom et retourne le profil mis à jour", async () => {
      mockAuthService.updateProfile.mockResolvedValue(
        new User("user_1", "me@example.com", "New Name", createdAt),
      );

      const res = await request(app)
        .patch("/me")
        .send({ name: "  New Name  " });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("New Name");
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith("user_1", {
        name: "New Name",
      });
    });

    it("rejette un email invalide avec le détail par champ", async () => {
      const res = await request(app)
        .patch("/me")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.email).toBeDefined();
      expect(mockAuthService.updateProfile).not.toHaveBeenCalled();
    });

    it("rejette un nom trop court", async () => {
      const res = await request(app).patch("/me").send({ name: "a" });

      expect(res.status).toBe(400);
      expect(res.body.error.details.name).toBeDefined();
    });

    it("rejette un corps vide", async () => {
      const res = await request(app).patch("/me").send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("refuse la modification de champs protégés", async () => {
      const res = await request(app)
        .patch("/me")
        .send({ name: "Valid Name", passwordHash: "x", id: "other" });

      expect(res.status).toBe(400);
      expect(mockAuthService.updateProfile).not.toHaveBeenCalled();
    });

    it("retourne 409 si l'email est déjà utilisé", async () => {
      mockAuthService.updateProfile.mockRejectedValue(
        new Error("Conflit de données : Cet email est déjà utilisé."),
      );

      const res = await request(app)
        .patch("/me")
        .send({ email: "taken@example.com" });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_ALREADY_IN_USE");
      expect(res.body.error.details.email).toBeDefined();
    });

    it("retourne 404 si l'utilisateur n'existe plus", async () => {
      mockAuthService.updateProfile.mockRejectedValue(
        new Error("Utilisateur introuvable"),
      );

      const res = await request(app).patch("/me").send({ name: "Valid Name" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  describe("GET /me/stats", () => {
    it("retourne les statistiques de l'utilisateur connecté", async () => {
      const stats = {
        projectCount: 1,
        taskCount: 3,
        tasksByStatus: { TODO: 2, DONE: 1 },
      };
      mockAuthService.getActivityStats.mockResolvedValue(stats);

      const res = await request(app).get("/me/stats");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(stats);
      expect(mockAuthService.getActivityStats).toHaveBeenCalledWith("user_1");
    });

    it("retourne 500 sans détail interne en cas d'erreur", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockAuthService.getActivityStats.mockRejectedValue(new Error("db down"));

      const res = await request(app).get("/me/stats");

      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toContain("db down");
    });
  });
});
