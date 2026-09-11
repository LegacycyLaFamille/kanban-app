import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../../../shared/security/requireAuth.js";

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

describe("requireAuth Middleware", () => {
  it("doit retourner un statut 401 si aucun cookie accessToken n'est présent", () => {
    const req = { cookies: {} } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("doit appeler next() et attacher l'utilisateur si le token est valide", () => {
    const req = {
      cookies: { accessToken: "valid_token" },
    } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as NextFunction;

    process.env.JWT_SECRET = "test_secret";
    vi.mocked(jwt.verify).mockReturnValue({ userId: "123" } as never);

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toEqual("123");
  });
});
