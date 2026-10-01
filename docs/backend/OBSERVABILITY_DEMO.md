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
- For step 6, an admin account in the app: register, then
  `npx tsx src/scripts/promote-admin.ts --email=<your email>` in `backend/`
  (see [ADMIN_ROLE.md](ADMIN_ROLE.md)).

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
`task.completed`. The `notifications.task-events` consumer handles every one
of them (and `task.assigned`), see [NOTIFICATIONS.md](NOTIFICATIONS.md).

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

## 6. Alerts

The **Alerts** panel at the top of the dashboard lists the six rules (see
[OBSERVABILITY.md](OBSERVABILITY.md#alerts)). After step 3, **Events
dead-lettered** fires within a minute, and **Dead-letter queue not empty**
after 5 minutes while the message stays there. Open Grafana → Alerting →
Alert rules to show the rule, its query and its state history.

To show the consumer alert: stop the backend (`Ctrl+C` on `npm run dev`).
**No consumer on the notification queue** goes *pending* within a minute and
*firing* after 5. Restart the backend: it resolves.

## 7. Admin system page

Sign in to the app with the admin account and open **System** in the
sidebar (<http://localhost:5173/admin/system>). Show, for the same moment:

- the overall status and its reasons: after step 3 it says **Degraded**,
  "1 event(s) failed for good and wait in kanban.events.dead-letter";
- the **Event queues** table with that message in "Failed for good";
- the **Events** counters (retried, dead-lettered) and the **Recent warnings
  and errors** list with the retry and dead-letter warnings;
- the **Open the Grafana dashboard** link, which leads back to the dashboard.

The point to make: the System page answers "is it working now?" for any app
admin, Grafana answers "what happened, when and why" with history, logs and
traces.

## Reset

Empty the dead-letter queue after the demo:

```bash
docker compose exec rabbitmq rabbitmqctl purge_queue kanban.events.dead-letter
```
