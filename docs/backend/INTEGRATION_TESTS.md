# Integration Tests

`npm run test:integration` runs two kinds of tests against a **real
PostgreSQL** (and a real RabbitMQ for the event workflow), with the
production classes:

- **API tests** (`src/tests/integration/api/`): HTTP requests to the real
  Express app (`src/app.ts`) through supertest, so routing, middlewares,
  validation, authentication, services, Prisma repositories and the database
  are tested together;
- **event workflow tests**: `RabbitMqEventBus`, `TaskService` and the
  notification consumer on a real broker.

Unit tests (`npm test`) never touch this suite.

## What is covered

### API

`src/tests/integration/api/auth.api.int.test.ts` (26 tests): registration
(validation, duplicates in any case), login (cookies, identical errors,
rate limit), protected requests (missing, forged, unsigned, expired or
wrong-type token), refresh rotation and replay, logout, password change
and account deletion revoking the session at once. Evidence for the
[authentication audit](../audit/AUTH_AUDIT.md).

`src/tests/integration/api/projects-tasks.api.int.test.ts` (27 tests):
project, board and task CRUD, cascades, validation errors (400), unknown
ids (404), malformed JSON, unauthenticated requests (401), assignee rules,
My Tasks.

`src/tests/integration/api/authorization.api.int.test.ts` (137 tests): the
owner / EDITOR / VIEWER / outsider / admin matrix over every project,
member, invitation, board, task and admin action, plus cross-project and
cross-board attempts by direct id. Evidence for the
[authorization audit](../audit/AUTHORIZATION_AUDIT.md).

`src/tests/integration/api/harness.ts` loads the app on the test database
(no broker: events are dropped by `publishSafely`, rate limits off except in
the test that checks them, logs silent) and provides `signUp` / `signIn`,
which return a supertest agent keeping the session cookies like a browser.

### Event workflow

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
| `INTEGRATION_RABBITMQ_URL` | `amqp://user:pass@localhost:5672/integration_test` (event workflow tests only) |

The API tests sign their tokens with `JWT_SECRET` if set, otherwise a fixed
test secret.

Safety and isolation rules:

- the database name **must end with `_test`**, otherwise the suite refuses to
  start: it truncates every table before each test (`resetDatabase` empties
  **all** application tables, so a new model is reset too); the
  authorization matrix keeps its five accounts but recreates every project,
  board, task, invitation and notification before each case;
- test files run one after the other (`fileParallelism: false`), they share
  the database;
- the suite applies the Prisma migrations itself (`prisma migrate deploy`,
  which also creates the database if needed);
- test consumers get a per-run suffix, and the shared queues are purged
  before the workflow tests.

## Run locally

Only the API tests (no RabbitMQ needed):

```bash
cd backend
INTEGRATION_DATABASE_URL="postgresql://<user>:<password>@localhost:5432/kanban_integration_test" \
npx vitest run --config vitest.integration.config.ts src/tests/integration/api
```

The whole suite:

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
