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

Configuration lives in `docker/observability/`.

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
keeps working. The full stack (`compose.yaml`, test/production) sets
`OTEL_SDK_DISABLED=true` by default.

## Checking each signal

In Grafana (<http://localhost:3001>), open **Explore**:

- **Metrics** (Prometheus): `http_server_request_duration_seconds_count`
- **Logs** (Loki): `{service_name="kanban-backend"}`. The `trace_id` field
  links to the trace in Tempo.
- **Traces** (Tempo): *Search*, service name `kanban-backend`. From a span,
  *Logs for this span* opens the matching Loki logs.

Metrics are pushed every 15 s: wait a little after sending requests.

## Security

- No secret is committed. Grafana runs with anonymous admin access and no
  login form, which is only acceptable because it listens on `127.0.0.1` in
  development. Never reuse this configuration on a server.
- Logs and telemetry must never contain passwords, tokens, cookies or user
  content.

## Troubleshooting

- Validate the collector configuration:
  `docker compose run --rm --no-deps otel-collector validate --config=/etc/otelcol-contrib/config.yaml`
- Collector logs: `docker logs kanban_otel_collector`
- Prometheus targets must be `UP`: <http://localhost:9090/targets>

## Instrumentation

### HTTP

Every request except `/api/v1/health` and `/api-docs` produces a trace and
the `http_server_request_duration_seconds` histogram (method, route, status).
Unexpected errors go through `recordError`
(`src/shared/observability/recordError.ts`): the exception is recorded on the
span, the span is marked as failed and an `error` log with the stack is
written.

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
in four rows: API, Event workflow, Logs and Traces. It is read-only in
Grafana: to change it, edit it in the UI, export it as JSON (Export → Export as
JSON, "Export the dashboard to use in another instance" off) and replace the
file.

The demonstration scenario is described in
[OBSERVABILITY_DEMO.md](OBSERVABILITY_DEMO.md).
