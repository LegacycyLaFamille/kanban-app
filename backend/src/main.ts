import { app } from "./app.js";
import { prisma } from "./shared/database/prisma.js";
import { rabbitMq } from "./shared/events/rabbitmq/index.js";
import { eventBus } from "./shared/events/index.js";
import { startNotificationConsumer } from "./modules/notifications/notification.bootstrap.js";
import { logger } from "./shared/observability/logger.js";
import { logFatalProcessErrors } from "./shared/http/errorHandler.js";

const port = process.env.PORT || 3000;

logFatalProcessErrors();

async function main() {
  try {
    await prisma.$connect();
    logger.info("Connexion à PostgreSQL établie avec succès.");

    // Registered before connecting so consumers start on the first
    // (re)connection.
    await startNotificationConsumer(eventBus);

    // Not awaited on purpose: the API must start even when the broker is
    // down; the connection keeps retrying in the background.
    void rabbitMq.start();

    app.listen(port, () => {
      logger.info(`Example app listening on port ${port}`);
    });
  } catch (error: unknown) {
    logger.error(
      { err: error },
      "Échec critique de connexion à la base de données :",
    );
    process.exit(1);
  }
}

main();
