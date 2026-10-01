# Observability

The development environment ships an observability stack to collect and
explore the backend telemetry: metrics, logs and traces.

```
backend --OTLP/HTTP :4318--> OpenTelemetry Collector --> Prometheus (metrics)
                                                     --> Loki       (logs)
                                                     --> Tempo      (traces)
                                    Grafana <-- reads all three
```

The OpenTelemetry Collector is the single ingestion point: the backend only
knows its address, never the storage backends.

## Services

| Service        | Image                                          | Local access                                     |
| -------------- | ---------------------------------------------- | ------------------------------------------------ |
| Grafana        | `grafana/grafana:13.2.3`                       | <http://localhost:3001>                          |
| Prometheus     | `prom/prometheus:v3.15.0`                      | <http://localhost:9090>                          |
| OTel Collector | `otel/opentelemetry-collector-contrib:0.161.0` | `localhost:4317` (gRPC), `localhost:4318` (HTTP) |
| Loki           | `grafana/loki:3.7.8`                           | internal only (`loki:3100`)                      |
| Tempo          | `grafana/tempo:2.10.8`                         | internal only (`tempo:3200`)                     |

Ports are bound to `127.0.0.1`. Prometheus also scrapes RabbitMQ's built-in
metrics endpoint (`rabbitmq:15692`, one series per queue).

Configuration lives in `docker/observability/`: `compose.yaml` is shared,
`compose.dev.yaml` (local ports, no login) is used by
`backend/docker-compose.yml` and `compose.deploy.yaml` (login, `/grafana`
path) by the root `compose.yaml`.

## Start / stop

The stack is included in the backend development compose file:

```bash
cd backend
docker compose up -d          # PostgreSQL, RabbitMQ and the observability stack
npm run dev
```

```bash
docker compose down           # stop, keep data
docker compose down -v        # stop and delete all volumes (database included)
```

## Backend configuration

`src/instrumentation.ts` starts the OpenTelemetry Node SDK before the
application (`--import` in the `dev`/`start` scripts and the Dockerfile). It
auto-instruments HTTP, Express, PostgreSQL (`pg`), RabbitMQ (`amqplib`) and
the `pino` logger (`src/shared/observability/logger.ts`).

| Variable                                                                | Dev value               | Description                    |
| ----------------------------------------------------------------------- | ----------------------- | ------------------------------ |
| `OTEL_SDK_DISABLED`                                                     | `false`                 | `true` turns all telemetry off |
| `OTEL_SERVICE_NAME`                                                     | `kanban-backend`        | `service.name` of every signal |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                           | `http://localhost:4318` | Collector address              |
| `OTEL_TRACES_EXPORTER` / `OTEL_METRICS_EXPORTER` / `OTEL_LOGS_EXPORTER` | `otlp`                  | Enables each signal            |
| `OTEL_METRIC_EXPORT_INTERVAL`                                           | `15000`                 | Metrics push interval (ms)     |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                         | `http`                  | Stable HTTP metric names       |
| `LOG_LEVEL`                                                             | `info`                  | pino log level                 |

When the collector is not running, telemetry is dropped silently: the backend
keeps working. The deployed stacks (`compose.yaml`) send their telemetry to their own
observability stack, see [Deployed stacks](#deployed-stacks).

## Checking each signal

In Grafana (<http://localhost:3001>), open **Explore**:

- **Metrics** (Prometheus): `http_server_request_duration_seconds_count`
- **Logs** (Loki): `{service_name="kanban-backend"}`. The `trace_id` field
  links to the trace in Tempo.
- **Traces** (Tempo): *Search*, service name `kanban-backend`. From a span,
  *Logs for this span* opens the matching Loki logs.

Metrics are pushed every 15 s: wait a little after sending requests.

## Security

- No secret is committed. In development, Grafana runs with anonymous admin
  access and no login form, which is only acceptable because it listens on
  `127.0.0.1`. The deployed Grafana requires a login.
- Logs and telemetry must never contain passwords, tokens, cookies or user
  content.

## Troubleshooting

- Validate the collector configuration:
  `docker compose run --rm --no-deps otel-collector validate --config=/etc/otelcol-contrib/config.yaml`
- Collector logs: `docker compose logs otel-collector`
- Prometheus targets must be `UP`: <http://localhost:9090/targets>

## Instrumentation

### HTTP

Every request except `/api/v1/health` and `/api-docs` produces a trace and
the `http_server_request_duration_seconds` histogram (method, route, status).
Unexpected errors go through `recordError`
(`src/shared/observability/recordError.ts`): the exception is recorded on the
span, the span is marked as failed and an `error` log with the stack is
written.

Errors no controller catches end in the global handler
(`src/shared/http/errorHandler.ts`, registered last in `main.ts`):

- malformed JSON answers **400** `INVALID_JSON`, a body over the size limit
  **413** `PAYLOAD_TOO_LARGE`, logged as a `warn` "Rejected malformed request";
- anything else (a middleware that throws, an async handler without
  try/catch) answers **500** `INTERNAL_SERVER_ERROR`, is recorded on the span
  and logged as an `error` "Unhandled request error";
- both logs carry `method`, `route` (the pattern, e.g.
  `/api/v1/tasks/:taskId`), `status`, `userId` when signed in, and
  `trace_id`; never the body, the query string or the headers. The client
  never gets a stack trace or an HTML page.

An unhandled promise rejection or uncaught exception is logged as a `fatal`
log before the process exits (`logFatalProcessErrors`), instead of a raw
stack trace on stderr.

### Event workflow

| Metric                                      | Labels                                                                   | Description           |
| ------------------------------------------- | ------------------------------------------------------------------------ | --------------------- |
| `kanban_events_published_total`             | `event_type`, `outcome` (`success`, `failure`)                           | Events sent to the broker |
| `kanban_events_consumed_total`              | `consumer`, `event_type`, `outcome` (`success`, `retry`, `dead_letter`, `unreadable`) | Events handled by a consumer |
| `kanban_events_processing_duration_seconds` | `consumer`, `event_type`, `outcome`                                      | Handler duration      |

The RabbitMQ auto-instrumentation creates the publish and consume spans and
carries the trace context in the message headers (`traceparent`). A request
that creates a task therefore produces one trace: HTTP, publish, consumer,
PostgreSQL. Retries are published from the consumer span and stay in the same
trace. Consumer spans carry `kanban.event.id`, `kanban.event.type`,
`kanban.consumer` and `kanban.event.attempt`.

Queue depths (retry and dead-letter queues included) come from RabbitMQ's own
metrics, e.g. `rabbitmq_queue_messages_ready`.

### Logs

Every backend log goes through pino (`src/shared/observability/logger.ts`):
JSON on stdout, with `trace_id` and `span_id` when a span is active, and sent
to Loki. Event workflow logs carry `component`, `eventId`, `eventType`,
`consumer` and `attempt`.

### Checking the instrumentation

What was checked against the running stack (development, 2026-10-02):

- a `POST /api/v1/projects/:projectId/tasks` produces **one** trace of 28
  spans: HTTP server span (route, status 201), Express middlewares,
  PostgreSQL queries, `publish kanban.events` (producer), then
  `notifications.task-events process` (consumer, with `kanban.event.*`
  attributes) and its own PostgreSQL queries;
- the backend logs of that request carry the same `trace_id`;
- the traces and logs of a registration and a login contain neither the
  password, nor the email, nor any token or cookie.

To repeat it: create a task, then in Grafana open the dashboard's **Event
workflow traces** panel, or Explore → Tempo with
`{ resource.service.name = "kanban-backend" && span.kanban.consumer != nil }`.

### Sensitive data

- pino replaces `password`, `passwordHash`, `token`, `accessToken` and
  `refreshToken` (top level and one level deep), plus the `authorization` and
  `cookie` request headers, with `[REDACTED]`.
- HTTP headers and bodies, message payloads and SQL parameters are never
  recorded.
- Event logs only carry ids and types, never payloads: task titles are user
  content.

## Dashboard

**Kanban - Backend observability** (Grafana → Dashboards → Kanban) is
provisioned from `docker/observability/grafana/dashboards/kanban-backend.json`,
in five rows: Alerts, API, Event workflow, Logs and Traces. It is read-only in
Grafana: to change it, edit it in the UI, export it as JSON (Export → Export as
JSON, "Export the dashboard to use in another instance" off) and replace the
file.

The demonstration scenario is described in
[OBSERVABILITY_DEMO.md](OBSERVABILITY_DEMO.md).

## Alerts

Six alert rules are provisioned from
`docker/observability/grafana/provisioning/alerting/kanban-alerts.yaml`
(Grafana → Alerting → Alert rules, folder **Kanban**), and listed in the
**Alerts** panel at the top of the dashboard:

| Rule | Fires when | Severity |
| --- | --- | --- |
| API 5xx error rate above 5% | more than 5% of requests fail with a 5xx, for 5 min | critical |
| API p95 latency above 1 s | p95 latency above 1 s, for 10 min | warning |
| Events dead-lettered | an event was dead-lettered or unreadable in the last 15 min | warning |
| Events could not be published | a publish to RabbitMQ failed in the last 15 min | warning |
| Dead-letter queue not empty | messages wait in `kanban.events.dead-letter`, for 5 min | info |
| No consumer on the notification queue | nobody consumes `notifications.task-events`, for 5 min | critical |

No traffic is not an error: rules on request metrics stay OK without data.
The last rule fires on missing data too, since a missing queue is the same
problem as a missing consumer.

**No contact point is provisioned**: alerts are visible in Grafana but nobody
is notified. To be notified, add a contact point (email, Discord, Slack…) in
Grafana → Alerting → Contact points and point the default notification policy
at it. Contact points hold secrets (webhook URLs, SMTP passwords): keep them
out of the repository.

To change a rule, edit the YAML file and restart Grafana
(`docker compose restart grafana`); rules provisioned from files cannot be
edited in the UI.

## Admin system page

Application admins (`User.role = ADMIN`) have a **System** page in the app
(`/admin/system`, sidebar entry "System"), backed by `GET /api/v1/admin/system`.
It answers "is everything working right now?" without Grafana access:

- overall status (`ok`, `degraded`, `down`) and the reasons behind it;
- database (with the latency of a `SELECT 1`) and RabbitMQ connection state;
- the notification workflow queues (`notifications.task-events`, its
  `.retry` queue, `kanban.events.dead-letter`): waiting messages and
  consumers, read with a passive `checkQueue` that consumes nothing;
- events published / processed / retried / dead-lettered since the backend
  started;
- activity: users, projects, tasks by status, overdue tasks, unread
  notifications;
- the last 20 warnings and errors logged by the backend;
- a link to this dashboard.

The page refreshes every 15 s (can be turned off) and only while the tab is
visible. Its status is `degraded` when the broker is not connected, when no
consumer listens on the notification queue, or when events wait in the
dead-letter queue; `down` when the database is unreachable.

What it does **not** replace: everything here is the backend's view of the
present moment. Counters reset when the backend restarts, the warnings list
lives in memory, and there is no history: that is what Grafana is for. Set
`GRAFANA_URL` on the backend (default in `compose.yaml`: `GRAFANA_ROOT_URL`,
in `backend/.env.example`: `http://localhost:3001`) to show the dashboard
link. Being an app admin does not give access to Grafana: Grafana has its own
login (see below).

Code: `backend/src/modules/admin/AdminSystemService.ts` (status rules),
`PrismaAdminStatsRepository.ts` (activity counts),
`RabbitMqConnection.inspectQueue`, `eventTotals()` in
`shared/observability/eventMetrics.ts`, `recentWarningsAndErrors()` in
`shared/observability/logger.ts`; frontend
`frontend/src/features/admin/pages/AdminSystemPage.tsx`.

## Deployed stacks

The root `compose.yaml` (Dev and main stacks on the VM, CI) runs the same
observability stack with `docker/observability/compose.deploy.yaml`. Grafana
is served by the frontend nginx at `/grafana` and requires a login; nothing
else is published. The backend sends its telemetry to the collector of its own
stack.

Before deploying, add to the stack's `.env` on the server (`~/kanban-dev`,
`~/kanban-main`):

```bash
GRAFANA_ADMIN_PASSWORD=<long random value>
GRAFANA_ROOT_URL=<site URL>/grafana/
```

The deployment fails without `GRAFANA_ADMIN_PASSWORD`. Then open
`<site URL>/grafana/` and log in as `admin`.

The password is only applied when Grafana's data volume is created. To change
it later, on the server, in the stack directory:

```bash
docker compose exec grafana grafana cli admin reset-admin-password <new password>
```

Each stack keeps its own data (7 days of metrics and logs, 3 days of traces)
and uses about 1 to 1.5 GB of RAM. To turn telemetry off for a stack, set
`OTEL_SDK_DISABLED=true` in its `.env`.

The site is served over plain HTTP: the Grafana password travels unencrypted.
