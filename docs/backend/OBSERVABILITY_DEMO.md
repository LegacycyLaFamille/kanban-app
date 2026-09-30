# Observability demo

Scenario to demonstrate the **Kanban - Backend observability** dashboard
(Grafana → Dashboards → Kanban). It takes about 10 minutes.

## Prerequisites

- `backend/.env` is complete, including the `RABBITMQ_*` and `OTEL_*`
  variables (see [Get_started.md](Get_started.md)).
- In `backend/`:

```bash
docker compose up -d
npx prisma migrate dev
npm run dev          # in a second terminal
```

- Open <http://localhost:3001>, then Dashboards → Kanban →
  Kanban - Backend observability.

## 1. API activity

From the repository root:

```bash
bash scripts/observability-demo.sh traffic 20
```

Each round creates a task, completes it, lists the tasks, then sends an
invalid payload (400), a request for an unknown task (404) and an
unauthenticated request (401).

Show in the **API** row: requests per second and per route, responses by
status code, the 4xx error rate, the p50/p95/p99 latency and the p95 latency
per route.

## 2. Event workflow

The same traffic publishes `task.created`, `task.updated` and
`task.completed`. The `notifications.task-events` consumer handles
`task.created` and `task.completed`.

Show in the **Event workflow** row: events published per type, events
consumed with the `success` outcome, the processing p95 and queue depths
staying close to 0.

## 3. Failures and retries

```bash
bash scripts/observability-demo.sh failure
```

The script stops PostgreSQL, publishes a `task.completed` event through the
RabbitMQ API, waits 25 s and restarts PostgreSQL. The consumer cannot read the
database: it retries 3 times, 5 s apart, then sends the event to the
dead-letter queue. API requests sent while PostgreSQL is stopped fail with a
500 and show up in the 5xx panels.

Show:

- **Failures and retries**: 3 `retry` bars, then one `dead_letter`.
- **Events dead-lettered**: 1.
- **RabbitMQ queue depth**: `notifications.task-events.retry` goes up and
  down, `kanban.events.dead-letter` keeps 1 message.
- **Errors and warnings**: `Event processing failed, retry scheduled`
  (attempts 1 to 3), then `Event processing failed, sent to dead-letter`.

## 4. Logs

Type `task.completed` or an event id in the **Log search** field at the top of
the dashboard. Expand a log line: the `trace_id` field has a **View trace**
link to Tempo.

## 5. Traces

In **Event workflow traces**, open a trace: it starts at
`POST /api/v1/projects/:projectId/tasks`, goes through the RabbitMQ publish
and the `notifications.task-events` consumer, down to the PostgreSQL queries.
The consumer span carries `kanban.event.id`, `kanban.event.type`,
`kanban.consumer` and `kanban.event.attempt`.

**Failed traces** lists the failed attempts of step 3.

## Reset

Empty the dead-letter queue after the demo:

```bash
docker compose exec rabbitmq rabbitmqctl purge_queue kanban.events.dead-letter
```
