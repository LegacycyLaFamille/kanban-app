import { Router, type Request, type Response } from "express";
import type { RabbitMqStatus } from "../events/rabbitmq/RabbitMqConnection.js";

export interface HealthDependencies {
  checkDatabase: () => Promise<void>;
  rabbitMqStatus: () => RabbitMqStatus;
}

// GET /health
// - 200 "ok"       : database and broker up (or broker disabled)
// - 200 "degraded" : database up, broker unreachable (the API still works,
//                    only asynchronous side effects are delayed)
// - 503 "down"     : database unreachable
export function createHealthRouter({
  checkDatabase,
  rabbitMqStatus,
}: HealthDependencies): Router {
  const router = Router();

  router.get("/health", async (_req: Request, res: Response) => {
    let database: "up" | "down" = "up";
    try {
      await checkDatabase();
    } catch {
      database = "down";
    }

    // Public endpoint: expose the state only, never the broker URL or raw
    // error messages (they leak hosts, users and internal IPs).
    const { state, connectedAt, reconnectAttempt } = rabbitMqStatus();
    const rabbitmq = { state, connectedAt, reconnectAttempt };
    const brokerUp = state === "connected" || state === "disabled";

    const status = database === "down" ? "down" : brokerUp ? "ok" : "degraded";

    res
      .status(status === "down" ? 503 : 200)
      .json({ status, database, rabbitmq });
  });

  return router;
}
