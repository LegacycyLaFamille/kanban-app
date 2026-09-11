import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import bcrypt from "bcrypt";
import type { UserRepository } from "../../../modules/users/UserRepository.js";
import { AuthService } from "../../../modules/auth/AuthService.js";
import jwt from "jsonwebtoken";
import { User } from "../../../modules/users/User.js";

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

describe("AuthService", () => {
  let authService: AuthService;
  let mockUserRepository: Mocked<UserRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test_secret";

    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      createWithPassword: vi.fn(),
      updateProfile: vi.fn(),
      updatePassword: vi.fn(),
      getCredentials: vi.fn(),
      updateRefreshToken: vi.fn(),
      findByRefreshToken: vi.fn(),
    } as unknown as Mocked<UserRepository>;

    authService = new AuthService(mockUserRepository);
  });
  describe("AuthService - Register", () => {
    it("doit inscrire un utilisateur avec un mot de passe haché et retourner l'entité pure", async () => {
      const email = "test@example.com";
      const name = "Test User";
      const plainPassword = "SuperPassword123";
      const fakeHash = "fake_hashed_string";

      vi.mocked(bcrypt.hash).mockResolvedValue(fakeHash as never);
      mockUserRepository.createWithPassword.mockResolvedValue();

      const user = await authService.register(email, name, plainPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 12);

      expect(user.email).toBe(email);
      expect(user.name).toBe(name);
      expect(user.id).toBeDefined();

      expect(mockUserRepository.createWithPassword).toHaveBeenCalledTimes(1);
      const [savedUser, savedHash] =
        mockUserRepository.createWithPassword.mock.calls[0]!;

      expect(savedUser.id).toBe(user.id);
      expect(savedHash).toBe(fakeHash);
    });

    it("doit propager l'erreur si l'email existe déjà (conflit)", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue("hash" as never);

      const conflictError = new Error(
        "Conflit de données : L'identifiant ou l'email existe déjà.",
      );
      mockUserRepository.createWithPassword.mockRejectedValue(conflictError);

      await expect(
        authService.register("test@example.com", "Name", "pass"),
      ).rejects.toThrow("Conflit de données");
    });
  });

  describe("AuthService - Login", () => {
    it("doit retourner les tokens et l'utilisateur avec des identifiants valides", async () => {
      const user = User.create("test@example.com", "Test User");
      const fakeHash = "hashed_password";

      mockUserRepository.getCredentials.mockResolvedValue({
        user,
        passwordHash: fakeHash,
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwt.sign)
        .mockReturnValueOnce("fake_access_token" as never)
        .mockReturnValueOnce("fake_refresh_token" as never);

      // Act
      const result = await authService.login(
        "test@example.com",
        "SuperPassword123",
      );

      // Assert
      expect(result.accessToken).toBe("fake_access_token");
      expect(result.refreshToken).toBe("fake_refresh_token");
      expect(result.user.id).toBe(user.id);
      expect(mockUserRepository.updateRefreshToken).toHaveBeenCalledWith(
        user.id,
        "fake_refresh_token",
      );
    });

    it("doit rejeter la connexion si l'email n'existe pas", async () => {
      mockUserRepository.getCredentials.mockResolvedValue(null);

      await expect(
        authService.login("wrong@example.com", "pass"),
      ).rejects.toThrow("Identifiants invalides");
    });

    it("doit rejeter la connexion si le mot de passe est incorrect", async () => {
      const user = User.create("test@example.com", "Test User");
      mockUserRepository.getCredentials.mockResolvedValue({
        user,
        passwordHash: "hash",
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        authService.login("test@example.com", "wrongpass"),
      ).rejects.toThrow("Identifiants invalides");
    });
  });

  describe("AuthService - Refresh Token", () => {
    it("doit générer un nouveau couple de tokens si le refresh token est valide", async () => {
      const user = User.create("test@example.com", "Test User");
      const validRefreshToken = "valid_refresh_token";

      mockUserRepository.findByRefreshToken.mockResolvedValue(user);
      vi.mocked(jwt.verify).mockReturnValue({ userId: user.id } as never);
      vi.mocked(jwt.sign)
        .mockReturnValueOnce("new_access_token" as never)
        .mockReturnValueOnce("new_refresh_token" as never);

      const result = await authService.refreshSession(validRefreshToken);

      expect(result.accessToken).toBe("new_access_token");
      expect(result.refreshToken).toBe("new_refresh_token");
      expect(mockUserRepository.updateRefreshToken).toHaveBeenCalledWith(
        user.id,
        "new_refresh_token",
      );
    });

    it("doit rejeter si le refresh token est introuvable en base ou invalide", async () => {
      mockUserRepository.findByRefreshToken.mockResolvedValue(null);

      await expect(authService.refreshSession("fake_token")).rejects.toThrow(
        /invalide|expiré/i,
      );
    });
  });

  describe("AuthService - Get Profile", () => {
    it("doit retourner l'utilisateur si l'id existe", async () => {
      const user = User.create("test@example.com", "Test User");
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await authService.getUserById(user.id);

      expect(result).toEqual(user);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(user.id);
    });

    it("doit retourner null si l'utilisateur n'existe pas", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await authService.getUserById("bad-id");
      expect(result).toBeNull();
    });
  });

  describe("AuthService - Logout", () => {
    it("doit invalider le refresh token en le mettant à null dans le repository", async () => {
      const userId = "user_123";
      mockUserRepository.updateRefreshToken.mockResolvedValue();

      await authService.logout(userId);

      expect(mockUserRepository.updateRefreshToken).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.updateRefreshToken).toHaveBeenCalledWith(
        userId,
        null,
      );
    });
  });
});
