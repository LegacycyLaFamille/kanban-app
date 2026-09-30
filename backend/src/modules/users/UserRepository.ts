import { User } from "./User.js";

export interface UserActivityStats {
  projectCount: number;
  taskCount: number;
  tasksByStatus: Record<string, number>;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  createWithPassword(user: User, passwordHash: string): Promise<void>;
  updateProfile(user: User): Promise<void>;
  getCredentials(
    email: string,
  ): Promise<{ user: User; passwordHash: string } | null>;
  // Dans PrismaUserRepository.ts
  updateRefreshToken(userId: string, token: string | null): Promise<void>;
  findByRefreshToken(token: string): Promise<User | null>;
  getActivityStats(userId: string): Promise<UserActivityStats>;
}
