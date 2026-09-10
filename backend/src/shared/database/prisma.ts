import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

const baseDbUrl = process.env.DATABASE_URL!;
const connectionString =
  process.env.NODE_ENV === "test" ? `${baseDbUrl}_test` : baseDbUrl;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

export { prisma };
