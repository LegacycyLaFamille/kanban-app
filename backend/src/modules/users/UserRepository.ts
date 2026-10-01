import { User } from "./User.js";

export interface UserActivityStats {
  projectCount: number;
  taskCount: number;
  tasksByStatus: Record<string, number>;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  // Case-insensitive.
  findByEmail(email: string): Promise<User | null>;
  createWithPassword(user: User, passwordHash: string): Promise<void>;
  updateProfile(user: User): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  findPasswordHash(userId: string): Promise<string | null>;
  // Erases the account; the schema cascades to everything the user owns.
  deleteById(userId: string): Promise<void>;
  getCredentials(
    email: string,
  ): Promise<{ user: User; passwordHash: string } | null>;
  // The user's active session id (SHA-256 of the current refresh token,
  // stored in User.refreshToken), null when signed out. See tokens.ts.
  updateRefreshToken(userId: string, sessionId: string | null): Promise<void>;
  findByRefreshToken(sessionId: string): Promise<User | null>;
  activeSessionId(userId: string): Promise<string | null>;
  getActivityStats(userId: string): Promise<UserActivityStats>;
}
