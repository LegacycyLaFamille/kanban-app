import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { Request, Response, NextFunction } from "express";
import express, { type Express } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import { requireAdmin } from "../../../shared/security/requireAdmin.js";
import { createRequireAuth } from "../../../shared/security/createRequireAuth.js";
import { User } from "../../../modules/users/User.js";
import type { UserRepository } from "../../../modules/users/UserRepository.js";

// jsonwebtoken is mocked: every token decodes to the mocked claims, and
// their session is always the active one.
const requireAuth = createRequireAuth({
  activeSessionId: async () => "session-1",
});

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("requireAdmin middleware", () => {
  let mockUserRepository: Mocked<Pick<UserRepository, "findById">>;

  const createdAt = new Date("2026-09-01T00:00:00.000Z");

  beforeEach(() => {
    mockUserRepository = { findById: vi.fn() };
  });

  it("calls next() when the authenticated user is an admin", async () => {
    mockUserRepository.findById.mockResolvedValue(
      User.create("admin@example.com", "Admin", "user_1", createdAt, "ADMIN"),
    );

    const req = { userId: "user_1" } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireAdmin(mockUserRepository as unknown as UserRepository)(
      req,
      res,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects a non-admin user with 403 and the standard error shape", async () => {
    mockUserRepository.findById.mockResolvedValue(
      User.create("user@example.com", "Regular User", "user_1", createdAt),
    );

    const req = { userId: "user_1" } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireAdmin(mockUserRepository as unknown as UserRepository)(
      req,
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "FORBIDDEN",
        message: "This action requires administrator access.",
      },
    });
  });

  it("rejects when the user id no longer resolves to a user", async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    const req = { userId: "ghost" } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireAdmin(mockUserRepository as unknown as UserRepository)(
      req,
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("rejects when req.userId is missing (defensive: should never run before requireAuth)", async () => {
    const req = {} as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireAdmin(mockUserRepository as unknown as UserRepository)(
      req,
      res,
      next,
    );

    expect(mockUserRepository.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  describe("chained after requireAuth", () => {
    function buildApp(userRepository: UserRepository): Express {
      const app = express();
      app.use(cookieParser());
      app.get(
        "/admin-only",
        requireAuth,
        requireAdmin(userRepository),
        (_req, res) => {
          res.status(200).json({ ok: true });
        },
      );
      return app;
    }

    it("rejects an unauthenticated request via requireAuth before requireAdmin ever runs", async () => {
      const findById = vi.fn();
      const app = buildApp({ findById } as unknown as UserRepository);

      const res = await request(app).get("/admin-only");

      expect(res.status).toBe(401);
      expect(findById).not.toHaveBeenCalled();
    });

    it("rejects an authenticated non-admin with 403", async () => {
      process.env.JWT_SECRET = "test_secret";
      vi.mocked(jwt.verify).mockReturnValue({
        userId: "user_1",
        typ: "access",
        sid: "session-1",
      } as never);

      const findById = vi
        .fn()
        .mockResolvedValue(
          User.create("user@example.com", "Regular User", "user_1", createdAt),
        );
      const app = buildApp({ findById } as unknown as UserRepository);

      const res = await request(app)
        .get("/admin-only")
        .set("Cookie", "accessToken=valid_token");

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("allows an authenticated admin through", async () => {
      process.env.JWT_SECRET = "test_secret";
      vi.mocked(jwt.verify).mockReturnValue({
        userId: "user_1",
        typ: "access",
        sid: "session-1",
      } as never);

      const findById = vi
        .fn()
        .mockResolvedValue(
          User.create(
            "admin@example.com",
            "Admin",
            "user_1",
            createdAt,
            "ADMIN",
          ),
        );
      const app = buildApp({ findById } as unknown as UserRepository);

      const res = await request(app)
        .get("/admin-only")
        .set("Cookie", "accessToken=valid_token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });
});
