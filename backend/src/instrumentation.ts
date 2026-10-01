import dotenv from "dotenv";
import { register } from "node:module";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

dotenv.config({ quiet: true });

const UNTRACED_ROUTES = ["/api/v1/health", "/api-docs"];

if (process.env.OTEL_SDK_DISABLED !== "true") {
  // Instrumentations only patch third-party packages: leave application
  // files alone, the hook cannot parse some of them (e.g. the generated
  // Prisma client in .ts under tsx).
  register("@opentelemetry/instrumentation/hook.mjs", import.meta.url, {
    data: { exclude: [/^file:(?!.*[\\/]node_modules[\\/])/] },
  });

  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
        "@opentelemetry/instrumentation-net": { enabled: false },
        "@opentelemetry/instrumentation-http": {
          ignoreIncomingRequestHook: (req) =>
            UNTRACED_ROUTES.some((route) => req.url?.startsWith(route)),
        },
      }),
    ],
  });
  sdk.start();

  const shutdown = () => {
    void sdk.shutdown().finally(() => process.exit(0));
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
