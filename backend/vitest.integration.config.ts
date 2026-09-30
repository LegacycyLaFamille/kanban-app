import { defineConfig } from "vitest/config";

// Integration suite: real PostgreSQL and RabbitMQ, see
// docs/backend/INTEGRATION_TESTS.md. Not part of `npm test`.
export default defineConfig({
  test: {
    include: ["src/tests/integration/**/*.int.test.ts"],
    globalSetup: ["src/tests/integration/globalSetup.ts"],
    // Files share one database and one broker.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
