import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { UserRepository } from "../../../modules/users/UserRepository.js";
import { AuthService } from "../../../modules/auth/AuthService.js";
import { User } from "../../../modules/users/User.js";
import { sessionIdOf } from "../../../shared/security/tokens.js";

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

describe("AuthService - account management", () => {
  let authService: AuthService;
  let mockUserRepository: Mocked<UserRepository>;

  const user = new User("user_1", "me@example.com", "Me", new Date());

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test_secret";

    mockUserRepository = {
      findById: vi.fn(),
      findPasswordHash: vi.fn(),
      updatePassword: vi.fn(),
      updateRefreshToken: vi.fn(),
      deleteById: vi.fn(),
    } as unknown as Mocked<UserRepository>;

    authService = new AuthService(mockUserRepository);
  });

  describe("changePassword", () => {
    it("hashes the new password and rotates the session", async () => {
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.findPasswordHash.mockResolvedValue("old_hash");
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue("new_hash" as never);
      vi.mocked(jwt.sign)
        .mockReturnValueOnce("refresh" as never)
        .mockReturnValueOnce("access" as never);

      const tokens = await authService.changePassword(
        "user_1",
        "old-password",
        "new-password",
      );

      expect(bcrypt.compare).toHaveBeenCalledWith("old-password", "old_hash");
      expect(bcrypt.hash).toHaveBeenCalledWith("new-password", 12);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        "user_1",
        "new_hash",
      );
      // The stored session is replaced: other sessions are revoked.
      expect(mockUserRepository.updateRefreshToken).toHaveBeenCalledWith(
        "user_1",
        sessionIdOf("refresh"),
      );
      expect(tokens).toEqual({
        accessToken: "access",
        refreshToken: "refresh",
      });
    });

    it("rejects a wrong current password without changing anything", async () => {
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.findPasswordHash.mockResolvedValue("old_hash");
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        authService.changePassword("user_1", "wrong", "new-password"),
      ).rejects.toThrow("Mot de passe actuel invalide");

      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
      expect(mockUserRepository.updateRefreshToken).not.toHaveBeenCalled();
    });

    it("fails when the user no longer exists", async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      mockUserRepository.findPasswordHash.mockResolvedValue(null);

      await expect(
        authService.changePassword("user_1", "old", "new-password"),
      ).rejects.toThrow("Utilisateur introuvable");
    });
  });

  describe("deleteAccount", () => {
    it("deletes the user record", async () => {
      await authService.deleteAccount("user_1");

      expect(mockUserRepository.deleteById).toHaveBeenCalledWith("user_1");
    });
  });
});
