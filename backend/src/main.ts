import express, { type Express, type Request, type Response } from "express";
import dotenv from "dotenv";
import legacy from "./legacy/index.js";
import { prisma } from "./shared/database/prisma.js";
import authRoutes from "./modules/auth/auth.routes.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import cookieParser from "cookie-parser";

dotenv.config();

export const app: Express = express();
const port = process.env.PORT || 3000;

const swaggerDocument = YAML.load(
  path.join(process.cwd(), "docs", "openapi.yaml"),
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.json());
app.use(cookieParser());

app.use("/api/legacy", legacy as unknown as express.RequestHandler);
app.use("/api/v1/auth", authRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello from ts backend");
});

async function main() {
  try {
    await prisma.$connect();
    console.log("Connexion à PostgreSQL établie avec succès.");

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
