import { randomUUID } from "node:crypto";

// Mirrors prisma/schema.prisma's Role enum. Kept as a plain string union here
// (not imported from generated/prisma) so the domain layer stays decoupled
// from Prisma, per the repository/service separation described in
// docs/architecture/BACKEND_MIGRATION.md §8.
export type UserRole = "USER" | "ADMIN";

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly role: UserRole = "USER",
  ) {}

  static create(
    email: string,
    name: string,
    id?: string,
    createdAt?: Date,
    role: UserRole = "USER",
  ): User {
    return new User(
      id ?? randomUUID(),
      email,
      name,
      createdAt ?? new Date(),
      role,
    );
  }
}
