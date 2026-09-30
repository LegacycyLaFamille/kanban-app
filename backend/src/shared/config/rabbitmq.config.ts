export interface RabbitMqConfig {
  url: string;
  // Same URL with the password masked, safe to log.
  safeUrl: string;
  // Max unacknowledged messages per consumer channel.
  prefetch: number;
}

export class RabbitMqConfigError extends Error {}

type Env = Record<string, string | undefined>;

function maskPassword(url: URL): string {
  const masked = new URL(url.href);
  if (masked.password) masked.password = "***";
  return masked.href;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new RabbitMqConfigError(
      `RABBITMQ_PREFETCH must be a positive integer, got "${value}"`,
    );
  }
  return parsed;
}

function buildUrl(env: Env): URL | null {
  if (env.RABBITMQ_URL) {
    try {
      return new URL(env.RABBITMQ_URL);
    } catch {
      throw new RabbitMqConfigError("RABBITMQ_URL is not a valid URL");
    }
  }

  if (!env.RABBITMQ_HOST) return null;

  const { RABBITMQ_USER: user, RABBITMQ_PASSWORD: password } = env;
  if (!user || !password) {
    throw new RabbitMqConfigError(
      "RABBITMQ_HOST is set but RABBITMQ_USER or RABBITMQ_PASSWORD is missing",
    );
  }

  const url = new URL(`amqp://${env.RABBITMQ_HOST}`);
  url.port = env.RABBITMQ_PORT ?? "5672";
  url.username = user;
  url.password = password;
  // The default vhost "/" must be sent url-encoded, as "%2F".
  url.pathname = `/${encodeURIComponent(env.RABBITMQ_VHOST ?? "/")}`;
  return url;
}

// Returns null when RabbitMQ is not configured at all: the backend then runs
// without a broker and says so at startup. Credentials only come from the
// environment, there are no defaults in the code.
export function loadRabbitMqConfig(
  env: Env = process.env,
): RabbitMqConfig | null {
  const url = buildUrl(env);
  if (url === null) return null;

  if (url.protocol !== "amqp:" && url.protocol !== "amqps:") {
    throw new RabbitMqConfigError(
      `RabbitMQ URL must use amqp:// or amqps://, got ${url.protocol}//`,
    );
  }

  return {
    url: url.href,
    safeUrl: maskPassword(url),
    prefetch: parsePositiveInt(env.RABBITMQ_PREFETCH, 10),
  };
}
