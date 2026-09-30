import express, { type Express, type Request, type Response } from "express";
import dotenv from "dotenv";
import legacy from "./legacy/index.js";
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
import { rabbitMq } from "./shared/events/rabbitmq/index.js";
import { createHealthRouter } from "./shared/http/health.routes.js";
import { eventBus } from "./shared/events/index.js";
import { startNotificationConsumer } from "./modules/notifications/notification.bootstrap.js";

dotenv.config();

export const app: Express = express();
const port = process.env.PORT || 3000;

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

app.use("/api/legacy", legacy as unknown as express.RequestHandler);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", projectRouter);
app.use("/api/v1", taskRouter);
app.use("/api/v1", boardRouter);
app.use("/api/v1", exportRouter);
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

async function main() {
  try {
    await prisma.$connect();
    console.log("Connexion à PostgreSQL établie avec succès.");

    // Registered before connecting so consumers start on the first
    // (re)connection.
    await startNotificationConsumer(eventBus);

    // Not awaited on purpose: the API must start even when the broker is
    // down; the connection keeps retrying in the background.
    void rabbitMq.start();

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      "Échec critique de connexion à la base de données :",
      message,
      { cause: error },
    );
    process.exit(1);
  }
}

main();
