import { randomUUID } from "node:crypto";

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly createdAt: Date,
  ) {}

  static create(
    email: string,
    name: string,
    id?: string,
    createdAt?: Date,
  ): User {
    return new User(id ?? randomUUID(), email, name, createdAt ?? new Date());
  }
}
