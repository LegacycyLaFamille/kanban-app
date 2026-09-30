# Integration Tests

`npm run test:integration` runs the event workflow against a **real
PostgreSQL and a real RabbitMQ**, with the production classes (Prisma
repositories, `RabbitMqEventBus`, `TaskService`, notification consumer).
Unit tests (`npm test`) never touch this suite.

## What is covered

`src/tests/integration/notification-workflow.int.test.ts`

- creating a task publishes `task.created`; the consumer persists a
  notification for the project member, not for the actor nor an outsider;
- moving a task to `DONE` notifies `task.completed`; an identical update
  notifies nothing;
- the same event delivered twice creates a single notification;
- a consumer failing once is retried and succeeds;
- a consumer failing every time ends in `kanban.events.dead-letter`, with
  its cause in the message headers.

`src/tests/integration/notification-repository.int.test.ts`

- `(eventId, userId)` unique index, cursor pagination without gaps or
  duplicates (including equal timestamps), another user's cursor refused,
  `markRead` scoped to the user and keeping the first date, `markAllRead`,
  actor and project names, cascade on project deletion.

## Configuration

| Variable | Example |
| -------- | ------- |
| `INTEGRATION_DATABASE_URL` | `postgresql://user:pass@localhost:5432/kanban_integration_test` |
| `INTEGRATION_RABBITMQ_URL` | `amqp://user:pass@localhost:5672/integration_test` |

Safety rules:

- the database name **must end with `_test`**, otherwise the suite refuses to
  start: it truncates every table before each test;
- the suite applies the Prisma migrations itself (`prisma migrate deploy`,
  which also creates the database if needed);
- test consumers get a per-run suffix, and the shared queues are purged
  before the workflow tests.

## Run locally

With the dev stack from `backend/docker-compose.yml`, use a dedicated vhost
so the tests never mix with your dev queues:

```bash
docker exec kanban_rabbitmq rabbitmqctl add_vhost integration_test
docker exec kanban_rabbitmq rabbitmqctl set_permissions -p integration_test <RABBITMQ_USER> '.*' '.*' '.*'

cd backend
INTEGRATION_DATABASE_URL="postgresql://<user>:<password>@localhost:5432/kanban_integration_test" \
INTEGRATION_RABBITMQ_URL="amqp://<user>:<password>@localhost:5672/integration_test" \
npm run test:integration
```

Special characters in passwords must be URL-encoded.

## CI

The `integration-backend` job of `.github/workflows/lint.yml` starts
PostgreSQL 16 and RabbitMQ 4 as service containers, generates the Prisma
client and runs the suite on every pull request.
