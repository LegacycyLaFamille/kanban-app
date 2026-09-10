import { User } from "./User.js";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  createWithPassword(user: User, passwordHash: string): Promise<void>;
  updateProfile(user: User): Promise<void>;
}
