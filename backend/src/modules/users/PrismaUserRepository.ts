import {
  PrismaClient,
  Prisma,
  type User as PrismaUser,
} from "../../generated/prisma/client.js";
import { User } from "./User.js";
import type { UserRepository } from "./UserRepository.js";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(prismaUser: PrismaUser): User {
    return new User(
      prismaUser.id,
      prismaUser.email,
      prismaUser.name,
      prismaUser.createdAt,
    );
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toDomain(user) : null;
  }

  async createWithPassword(user: User, passwordHash: string): Promise<void> {
    try {
      await this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash: passwordHash,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new Error(
          "Conflit de données : L'identifiant ou l'email existe déjà.",
          {
            cause: error,
          },
        );
      }
      throw new Error("Erreur interne lors de la création de l'utilisateur", {
        cause: error,
      });
    }
  }

  async updateProfile(user: User): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new Error(
          "Conflit de données : Cet email est déjà utilisé par un autre compte.",
          {
            cause: error,
          },
        );
      }
      throw new Error("Erreur interne lors de la mise à jour du profil", {
        cause: error,
      });
    }
  }

  async getCredentials(
    email: string,
  ): Promise<{ user: User; passwordHash: string } | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    if (!record) return null;

    const user = User.create(record.email, record.name, record.id);
    return { user, passwordHash: record.passwordHash };
  }

  async updateRefreshToken(
    userId: string,
    token: string | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: token },
    });
  }

  async findByRefreshToken(token: string): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: { refreshToken: token },
    });
    if (!record) return null;
    return User.create(record.email, record.name, record.id, record.createdAt);
  }
}
