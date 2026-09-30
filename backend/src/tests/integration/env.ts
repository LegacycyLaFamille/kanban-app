// Connection settings of the integration suite. The database name must end
// with `_test`: the suite truncates every table.
export function integrationEnv(): { databaseUrl: string; rabbitMqUrl: string } {
  const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
  const rabbitMqUrl = process.env.INTEGRATION_RABBITMQ_URL;
  if (!databaseUrl || !rabbitMqUrl) {
    throw new Error(
      "Set INTEGRATION_DATABASE_URL and INTEGRATION_RABBITMQ_URL to run the " +
        "integration tests (see docs/backend/INTEGRATION_TESTS.md)",
    );
  }
  const database = new URL(databaseUrl).pathname.slice(1);
  if (!database.endsWith("_test")) {
    throw new Error(
      `Refusing to run on database "${database}": its name must end with _test`,
    );
  }
  return { databaseUrl, rabbitMqUrl };
}
