import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import express, { type Express, type NextFunction } from "express";
import request from "supertest";
import { AuthController } from "../../../modules/auth/AuthController.js";
import type { AuthService } from "../../../modules/auth/AuthService.js";
import { changePasswordSchema } from "../../../modules/auth/auth.schema.js";
import { validateSchema } from "../../../shared/http/validateSchema.js";

describe("AuthController - account management", () => {
  let app: Express;
  let mockAuthService: Mocked<
    Pick<AuthService, "changePassword" | "deleteAccount">
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthService = {
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
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
    app.patch(
      "/me/password",
      fakeAuth,
      validateSchema(changePasswordSchema),
      controller.changePassword,
    );
    app.delete("/me", fakeAuth, controller.deleteAccount);
  });

  describe("PATCH /me/password", () => {
    it("changes the password and sets fresh session cookies", async () => {
      mockAuthService.changePassword.mockResolvedValue({
        accessToken: "access",
        refreshToken: "refresh",
      });

      const res = await request(app)
        .patch("/me/password")
        .send({ currentPassword: "old-password", newPassword: "new-password" });

      expect(res.status).toBe(204);
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        "user_1",
        "old-password",
        "new-password",
      );
      const cookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookies.some((c) => c.startsWith("accessToken=access"))).toBe(
        true,
      );
      expect(cookies.some((c) => c.startsWith("refreshToken=refresh"))).toBe(
        true,
      );
    });

    it("returns a field error when the current password is wrong", async () => {
      mockAuthService.changePassword.mockRejectedValue(
        new Error("Mot de passe actuel invalide"),
      );

      const res = await request(app)
        .patch("/me/password")
        .send({ currentPassword: "wrong", newPassword: "new-password" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
      expect(res.body.error.details.currentPassword).toBeDefined();
    });

    it("rejects a new password shorter than 8 characters", async () => {
      const res = await request(app)
        .patch("/me/password")
        .send({ currentPassword: "old-password", newPassword: "short" });

      expect(res.status).toBe(400);
      expect(mockAuthService.changePassword).not.toHaveBeenCalled();
    });

    it("rejects a new password identical to the current one", async () => {
      const res = await request(app).patch("/me/password").send({
        currentPassword: "same-password",
        newPassword: "same-password",
      });

      expect(res.status).toBe(400);
      expect(mockAuthService.changePassword).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /me", () => {
    it("deletes the account and clears the session cookies", async () => {
      mockAuthService.deleteAccount.mockResolvedValue();

      const res = await request(app).delete("/me");

      expect(res.status).toBe(204);
      expect(mockAuthService.deleteAccount).toHaveBeenCalledWith("user_1");
      const cookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookies.some((c) => c.startsWith("accessToken=;"))).toBe(true);
      expect(cookies.some((c) => c.startsWith("refreshToken=;"))).toBe(true);
    });

    it("returns 500 without internal details on failure", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockAuthService.deleteAccount.mockRejectedValue(new Error("db down"));

      const res = await request(app).delete("/me");

      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toContain("db down");
    });
  });
});
