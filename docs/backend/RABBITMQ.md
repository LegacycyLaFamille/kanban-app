# RabbitMQ

RabbitMQ is the message broker of the event-driven workflows
([ADR-008](../adr/ADR-008-rabbitmq-events.md)). This page covers the broker
setup and the backend connection. Publishing and consuming events goes through
the Event Bus, see [EVENTS.md](EVENTS.md).

## Configuration

All settings come from environment variables. No credential lives in the
code, and both compose files refuse to start without a password.

| Variable            | Default | Description                                                 |
| ------------------- | ------- | ----------------------------------------------------------- |
| `RABBITMQ_HOST`     | —       | Broker host. Unset (with no `RABBITMQ_URL`) = broker disabled |
| `RABBITMQ_PORT`     | `5672`  | AMQP port                                                   |
| `RABBITMQ_USER`     | —       | Required when `RABBITMQ_HOST` is set                        |
| `RABBITMQ_PASSWORD` | —       | Required when `RABBITMQ_HOST` is set, any characters allowed |
| `RABBITMQ_VHOST`    | `/`     | Virtual host                                                |
| `RABBITMQ_URL`      | —       | Full `amqp://` or `amqps://` URL, overrides the values above. Special characters in the password must be URL-encoded |
| `RABBITMQ_PREFETCH` | `10`    | Max unacknowledged messages per consumer channel            |

An invalid configuration (host without credentials, bad URL, bad prefetch)
stops the backend at startup with an explicit error.

## Local development

Add the variables to `backend/.env` (see `.env.example`), then:

```bash
cd backend
docker compose up -d        # PostgreSQL + RabbitMQ
npm run dev
```

- Management UI: <http://localhost:15672>, log in with `RABBITMQ_USER` /
  `RABBITMQ_PASSWORD`. It shows connections, exchanges, queues and message
  rates.
- To work without a broker, leave `RABBITMQ_HOST` unset. The backend logs
  `running without a message broker` and everything else works.

## Test / production stack

`compose.yaml` runs a `rabbitmq` service (`rabbitmq:4-management-alpine`,
data in the `rabbitmq-data` volume). The backend waits for it to be healthy
and reaches it at `rabbitmq:5672` on the internal network.

Before the first deployment, add to the stack's `.env` on the server
(`~/kanban-dev`, `~/kanban-main`):

```bash
RABBITMQ_USER=kanban
RABBITMQ_PASSWORD=<long random value>
```

Ports are not published on the host. To open the management UI from your
machine, get the container IP on the server, then tunnel to it:

```bash
# on the server, in the stack directory
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
  "$(docker compose ps -q rabbitmq)"

# on your machine, with the IP printed above
ssh -L 15672:<container-ip>:15672 <user>@<vm>
# then open http://localhost:15672
```

Or check it from the server:

```bash
docker compose exec rabbitmq rabbitmq-diagnostics status
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers
```

## Topology

The backend declares these on every (re)connection. Declaring is idempotent.

| Name                        | Kind             | Purpose                                         |
| --------------------------- | ---------------- | ----------------------------------------------- |
| `kanban.events`             | topic exchange   | Domain events, routing key `<domain>.<action>` (e.g. `task.created`) |
| `kanban.events.dlx`         | topic exchange   | Dead-letter exchange                            |
| `kanban.events.dead-letter` | queue (`#` on DLX) | Receives events that failed every attempt      |
| `<consumer>`                | queue            | One per subscription, declared by the Event Bus |
| `<consumer>.retry`          | queue (TTL)      | Delays retries, then returns them to `<consumer>` |

Everything is durable. A module adds its own queue through `withQueues` in
`src/shared/events/rabbitmq/topology.ts`, for example:

```ts
withQueues(defaultTopology, {
  name: "notifications.task-created",
  exchange: EVENTS_EXCHANGE,
  bindings: ["task.created"],
  deadLetter: true, // rejected messages go to kanban.events.dead-letter
});
```

## Broker unavailable

The HTTP API never depends on the broker:

- the backend starts even if RabbitMQ is down and keeps retrying in the
  background (1 s, 2 s, 4 s… up to 30 s between attempts);
- each failed attempt is logged: `[rabbitmq] Broker unavailable (…), retry #3 in 4000ms`;
- after a lost connection, it reconnects and declares the topology again;
- the password is never logged (`amqp://kanban:***@…`).

## Health

`GET /api/v1/health` (public):

```json
{ "status": "degraded", "database": "up", "rabbitmq": { "state": "disconnected", "reconnectAttempt": 3 } }
```

| `status`   | HTTP | Meaning                                        |
| ---------- | ---- | ---------------------------------------------- |
| `ok`       | 200  | Database up, broker connected or disabled      |
| `degraded` | 200  | Database up, broker unreachable                |
| `down`     | 503  | Database unreachable                           |

The endpoint shows the broker state only, never its URL or error messages.
Details are in the backend logs.

## Code

- `src/shared/config/rabbitmq.config.ts`: reads and validates the environment
- `src/shared/events/rabbitmq/RabbitMqConnection.ts`: connection, retries,
  status, channels
- `src/shared/events/rabbitmq/topology.ts`: exchanges and queues
- `src/shared/events/rabbitmq/index.ts`: backend-wide `rabbitMq` instance,
  started in `src/main.ts`
- `src/shared/http/health.routes.ts`: health endpoint
