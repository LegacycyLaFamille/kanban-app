import bcrypt from "bcrypt";
import { User } from "../users/User.js";
import type { UserRepository } from "../users/UserRepository.js";
import jwt from "jsonwebtoken";

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
      const secret = process.env.JWT_SECRET!;
      jwt.verify(incomingRefreshToken, secret);

      const user =
        await this.userRepository.findByRefreshToken(incomingRefreshToken);
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

  private async generateAuthTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("FATAL: JWT_SECRET manquant.");

    const accessToken = jwt.sign({ userId: user.id }, secret, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign({ userId: user.id }, secret, {
      expiresIn: "7d",
    });

    await this.userRepository.updateRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }
  async logout(userId: string): Promise<void> {
    await this.userRepository.updateRefreshToken(userId, null);
  }
}
