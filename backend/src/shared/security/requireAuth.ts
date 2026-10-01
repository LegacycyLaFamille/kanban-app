import { prisma } from "../database/prisma.js";
import { PrismaUserRepository } from "../../modules/users/PrismaUserRepository.js";
import { createRequireAuth } from "./createRequireAuth.js";

// The middleware every protected route uses. Its rules are in
// createRequireAuth.ts, testable without a database.
export const requireAuth = createRequireAuth(new PrismaUserRepository(prisma));
