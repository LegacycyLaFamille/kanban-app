import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import { AdminSystemController } from "../../../modules/admin/AdminSystemController.js";
import type { AdminSystemService } from "../../../modules/admin/AdminSystemService.js";
import { createRequireAuth } from "../../../shared/security/createRequireAuth.js";
import { requireAdmin } from "../../../shared/security/requireAdmin.js";
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

describe("AdminSystemController", () => {
  let app: Express;
  let status: ReturnType<typeof vi.fn>;
  let mockUserRepository: { findById: ReturnType<typeof vi.fn> };

  const createdAt = new Date("2026-09-01T00:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test_secret";

    status = vi.fn();
    mockUserRepository = { findById: vi.fn() };
    const controller = new AdminSystemController({
      status,
    } as unknown as AdminSystemService);

    app = express();
    app.use(cookieParser());
    app.get(
      "/admin/system",
      requireAuth,
      requireAdmin(mockUserRepository as unknown as UserRepository),
      controller.getStatus,
    );
  });

  function asUser(role: "USER" | "ADMIN") {
    vi.mocked(jwt.verify).mockReturnValue({
      userId: "user-1",
      typ: "access",
      sid: "session-1",
    } as never);
    mockUserRepository.findById.mockResolvedValue(
      User.create("u@example.com", "U", "user-1", createdAt, role),
    );
  }

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/admin/system");

    expect(res.status).toBe(401);
    expect(status).not.toHaveBeenCalled();
  });

  it("rejects a non-admin", async () => {
    asUser("USER");

    const res = await request(app)
      .get("/admin/system")
      .set("Cookie", "accessToken=valid_token");

    expect(res.status).toBe(403);
    expect(status).not.toHaveBeenCalled();
  });

  it("returns the system status to an admin, uncached", async () => {
    asUser("ADMIN");
    status.mockResolvedValue({ status: "ok" });

    const res = await request(app)
      .get("/admin/system")
      .set("Cookie", "accessToken=valid_token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("answers 500 when the status cannot be computed", async () => {
    asUser("ADMIN");
    status.mockRejectedValue(new Error("boom"));

    const res = await request(app)
      .get("/admin/system")
      .set("Cookie", "accessToken=valid_token");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});
