import express, { type Express, type Request, type Response } from "express";
import dotenv from "dotenv";
import { prisma } from "./shared/database/prisma.js";
import authRoutes from "./modules/auth/auth.routes.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import cookieParser from "cookie-parser";
import { projectRouter } from "./modules/projects/project.routes.js";
import { taskRouter } from "./modules/tasks/task.routes.js";
import { boardRouter } from "./modules/boards/board.routes.js";
import { exportRouter } from "./modules/exports/export.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { notificationRouter } from "./modules/notifications/notification.routes.js";
import { invitationRouter } from "./modules/invitations/invitation.routes.js";
import { rabbitMq } from "./shared/events/rabbitmq/index.js";
import { createHealthRouter } from "./shared/http/health.routes.js";
import { errorHandler } from "./shared/http/errorHandler.js";

dotenv.config();

// The Express application, without starting anything: main.ts connects the
// database and the broker and listens; the API integration tests call it
// directly with supertest.
export const app: Express = express();

// The backend is only reachable through nginx (docker/frontend/nginx.conf),
// so the client IP used by the rate limiters is the one nginx forwards.
app.set("trust proxy", 1);

const swaggerDocument = YAML.load(
  path.join(process.cwd(), "docs", "openapi.yaml"),
);
const swaggerOptions = {
  swaggerOptions: {
    withCredentials: true,
  },
};

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, swaggerOptions),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", projectRouter);
app.use("/api/v1", taskRouter);
app.use("/api/v1", boardRouter);
app.use("/api/v1", exportRouter);
app.use("/api/v1", adminRouter);
app.use("/api/v1", notificationRouter);
app.use("/api/v1", invitationRouter);
app.use(
  "/api/v1",
  createHealthRouter({
    checkDatabase: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
    rabbitMqStatus: () => rabbitMq.status(),
  }),
);

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello from ts backend");
});

// Must stay last: Express only routes errors to handlers declared after
// the routes.
app.use(errorHandler);
