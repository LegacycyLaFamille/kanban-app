import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

import { AuthController } from "../../../modules/auth/AuthController.js";
import type { AuthService } from "../../../modules/auth/AuthService.js";
import {
  loginSchema,
  registerSchema,
} from "../../../modules/auth/auth.schema.js";
import { validateSchema } from "../../../shared/http/validateSchema.js";
import { User } from "../../../modules/users/User.js";

describe("AuthController - register / login", () => {
  let app: Express;
  let mockAuthService: Mocked<Pick<AuthService, "register" | "login">>;

  const createdAt = new Date("2026-09-01T10:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthService = {
      register: vi.fn(),
      login: vi.fn(),
    };

    const controller = new AuthController(
      mockAuthService as unknown as AuthService,
    );

    app = express();
    app.use(express.json());
    app.post("/register", validateSchema(registerSchema), controller.register);
    app.post("/login", validateSchema(loginSchema), controller.login);
  });

  describe("POST /register", () => {
    it("registers a user with a valid payload", async () => {
      mockAuthService.register.mockResolvedValue(
        new User("user-1", "jane@example.com", "Jane Doe", createdAt),
      );

      const res = await request(app).post("/register").send({
        email: "jane@example.com",
        name: "Jane Doe",
        password: "password123",
      });

      expect(res.status).toBe(201);
      expect(mockAuthService.register).toHaveBeenCalledWith(
        "jane@example.com",
        "Jane Doe",
        "password123",
      );
    });

    it("rejects an invalid email", async () => {
      const res = await request(app).post("/register").send({
        email: "not-an-email",
        name: "Jane Doe",
        password: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.email).toBeDefined();
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it("rejects a password shorter than 8 characters", async () => {
      const res = await request(app).post("/register").send({
        email: "jane@example.com",
        name: "Jane Doe",
        password: "short",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.details.password).toBeDefined();
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it("rejects a missing name", async () => {
      const res = await request(app).post("/register").send({
        email: "jane@example.com",
        password: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.details.name).toBeDefined();
    });

    it("returns 409 with the standard shape when the email is already used", async () => {
      mockAuthService.register.mockRejectedValue(
        new Error("Conflit de données : L'identifiant ou l'email existe déjà."),
      );

      const res = await request(app).post("/register").send({
        email: "jane@example.com",
        name: "Jane Doe",
        password: "password123",
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_ALREADY_IN_USE");
    });
  });

  describe("POST /login", () => {
    it("logs in with a valid payload", async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: new User("user-1", "jane@example.com", "Jane Doe", createdAt),
      });

      const res = await request(app)
        .post("/login")
        .send({ email: "jane@example.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(mockAuthService.login).toHaveBeenCalledWith(
        "jane@example.com",
        "password123",
      );
    });

    it("rejects a missing password", async () => {
      const res = await request(app)
        .post("/login")
        .send({ email: "jane@example.com" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it("returns the standard 401 shape on invalid credentials", async () => {
      mockAuthService.login.mockRejectedValue(
        new Error("Identifiants invalides"),
      );

      const res = await request(app)
        .post("/login")
        .send({ email: "jane@example.com", password: "wrong-password" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials.",
        },
      });
    });
  });
});
