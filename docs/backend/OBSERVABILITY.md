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
