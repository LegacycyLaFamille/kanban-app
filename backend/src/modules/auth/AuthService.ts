import bcrypt from "bcrypt";
import { User } from "../users/User.js";
import type {
  UserActivityStats,
  UserRepository,
} from "../users/UserRepository.js";
import {
  issueSessionTokens,
  sessionIdOf,
  verifyToken,
} from "../../shared/security/tokens.js";

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(
    email: string,
    name: string,
    plainTextPassword: string,
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(plainTextPassword, 12);

    const user = User.create(email, name);

    await this.userRepository.createWithPassword(user, passwordHash);

    return user;
  }

  async login(
    email: string,
    plainTextPassword: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const credentials = await this.userRepository.getCredentials(email);
    if (
      !credentials ||
      !(await bcrypt.compare(plainTextPassword, credentials.passwordHash))
    ) {
      throw new Error("Identifiants invalides");
    }

    const tokens = await this.generateAuthTokens(credentials.user);
    return { ...tokens, user: credentials.user };
  }

  async refreshSession(
    incomingRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    try {
      // Only a refresh token, and only the user's current one: an old token
      // (already rotated, logged out) or an access token is refused.
      verifyToken(incomingRefreshToken, "refresh");

      const user = await this.userRepository.findByRefreshToken(
        sessionIdOf(incomingRefreshToken),
      );
      if (!user) throw new Error("Token invalide ou révoqué");

      const tokens = await this.generateAuthTokens(user);
      return { ...tokens, user };
    } catch {
      throw new Error("Session expirée");
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }

  async updateProfile(
    userId: string,
    changes: { name?: string | undefined; email?: string | undefined },
  ): Promise<User> {
    const current = await this.userRepository.findById(userId);
    if (!current) throw new Error("Utilisateur introuvable");

    const updated = new User(
      current.id,
      changes.email ?? current.email,
      changes.name ?? current.name,
      current.createdAt,
      current.role,
    );

    await this.userRepository.updateProfile(updated);

    return updated;
  }

  // Rotates the session: the new refresh token replaces the stored one, so
  // every other session of the user is revoked along with the old password.
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findById(userId);
    const passwordHash = await this.userRepository.findPasswordHash(userId);
    if (!user || !passwordHash) throw new Error("Utilisateur introuvable");

    if (!(await bcrypt.compare(currentPassword, passwordHash))) {
      throw new Error("Mot de passe actuel invalide");
    }

    await this.userRepository.updatePassword(
      userId,
      await bcrypt.hash(newPassword, 12),
    );

    return this.generateAuthTokens(user);
  }

  // GDPR right to erasure (art. 17).
  async deleteAccount(userId: string): Promise<void> {
    await this.userRepository.deleteById(userId);
  }

  async getActivityStats(userId: string): Promise<UserActivityStats> {
    return this.userRepository.getActivityStats(userId);
  }

  // Starts a new session: it replaces the user's previous one (one session
  // per user), whose tokens stop working immediately. Only the session id
  // (a hash of the refresh token) is stored, never the token itself.
  private async generateAuthTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { accessToken, refreshToken, sessionId } = issueSessionTokens(
      user.id,
    );

    await this.userRepository.updateRefreshToken(user.id, sessionId);

    return { accessToken, refreshToken };
  }
  async logout(userId: string): Promise<void> {
    await this.userRepository.updateRefreshToken(userId, null);
  }
}
