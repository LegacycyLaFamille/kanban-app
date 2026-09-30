# Event Bus

Business modules publish and consume domain events through the `EventBus`
interface ([ADR-008](../adr/ADR-008-rabbitmq-events.md)). RabbitMQ is only
the infrastructure behind it: no module imports `amqplib`. Broker setup is
described in [RABBITMQ.md](RABBITMQ.md).

## Event envelope

Every event has the same envelope (`src/shared/events/DomainEvent.ts`):

```json
{
  "id": "0b6f2c1e-6d7a-4c1b-9d0e-2a4f5b8c9d10",
  "type": "task.created",
  "version": 1,
  "occurredAt": "2026-09-30T10:00:00.000Z",
  "actorId": "7c1d…",
  "payload": { "taskId": "…", "projectId": "…" }
}
```

| Field        | Meaning                                                           |
| ------------ | ----------------------------------------------------------------- |
| `id`         | Unique UUID per event. Consumers use it to detect duplicates      |
| `type`       | `<domain>.<action>`, lowercase (e.g. `task.created`). Also the RabbitMQ routing key |
| `version`    | Version of the payload schema of this type                        |
| `occurredAt` | When the business fact happened (ISO-8601, UTC)                   |
| `actorId`    | User who triggered it, `null` for system events                   |
| `payload`    | JSON only: no `Date` (use ISO strings), no `undefined`            |

Create events with `createEvent`, which fills `id`, `occurredAt` and
validates the type:

```ts
type TaskCreated = DomainEvent<"task.created", { taskId: string; projectId: string }>;

const event: TaskCreated = createEvent(
  "task.created",
  { taskId: task.id, projectId: task.projectId },
  { actorId: userId },
);
```

Declare payloads with `type`, not `interface`, so TypeScript can check that
they are JSON-serializable.

## Published events

| Type             | When                                                  | Payload |
| ---------------- | ----------------------------------------------------- | ------- |
| `task.created`   | After a task is saved                                 | `taskId`, `projectId`, `boardId`, `title`, `status`, `priority` |
| `task.updated`   | After an update that changed at least one field      | `taskId`, `projectId`, `title`, `changes` (field names), `previousStatus`, `status` |
| `task.completed` | On a status change from anything else to `DONE`, in addition to `task.updated` | `taskId`, `projectId`, `title`, `previousStatus` |

Types are defined in `src/modules/tasks/task.events.ts`. Consumers:
[NOTIFICATIONS.md](NOTIFICATIONS.md).

## Publishing

Modules receive an `EventBus` through their constructor (wired in the
module's `*.routes.ts` with the shared `eventBus` from
`src/shared/events/index.ts`).

Publish **after** the business change is persisted. For side effects
(notifications…), use `publishSafely`: a broker failure is logged but does
not fail the HTTP request.

```ts
const task = await this.taskRepository.save(newTask);
await publishSafely(this.eventBus, createEvent("task.created", {...}, { actorId }));
return task;
```

`eventBus.publish` itself resolves only once RabbitMQ has confirmed the
message, and rejects with `EventPublishError` otherwise.

Known limit, accepted for S2-28: an event published while the broker is
unreachable is **not retried**. It is logged as an error (see below) and
must be handled by hand if needed.

## Consuming

```ts
await eventBus.subscribe<TaskCreated>({
  name: "notifications.task-events", // `<module>.<purpose>`, unique
  eventTypes: ["task.created"],      // wildcards allowed: "task.*"
  handler: async (event) => { … },
});
```

- Each subscription gets its own durable RabbitMQ queue named after
  `name`, bound to `eventTypes` on `kanban.events`. Several subscriptions
  receive their own copy of the same event.
- The handler resolving acknowledges the message. Failures are handled as
  described in [Failures and retries](#failures-and-retries).
- Consumers are re-created automatically after a reconnection.
- Delivery is **at-least-once**: the same event can be delivered twice
  (e.g. connection lost before the ack). Handlers must be idempotent, using
  `event.id`.
- Removing an event type from `eventTypes` does not remove the existing
  binding in RabbitMQ: unbind it manually from the management UI.

## Failures and retries

**Consumers.** When a handler throws, the event is retried for **this
consumer only**, after a delay, then dead-lettered:

```text
kanban.events ─► <consumer> ──handler throws──► <consumer>.retry (TTL 5 s)
                     ▲                                  │ expires
                     └──────────────────────────────────┘
after 4 attempts (1 + 3 retries) ──► kanban.events.dlx ─► kanban.events.dead-letter
```

| Case | Behaviour |
| ---- | --------- |
| Handler throws | Retried up to 3 times, 5 s apart, then dead-letter |
| Handler throws `NonRetryableEventError` | Dead-letter at once (retrying cannot help, e.g. invalid payload) |
| Unreadable message (bad JSON / envelope) | Dead-letter at once, routing key `unreadable` |
| Retry / dead-letter copy not confirmed by the broker | Original requeued, never lost |

- Retries go through `<consumer>.retry`, whose expired messages return to
  `<consumer>` only: other subscribers of the same event are not affected.
- A message is acknowledged only once its retry or dead-letter copy has
  been confirmed by RabbitMQ.
- Retried and dead-lettered messages keep their body and `messageId` (the
  event id) and carry headers: `x-retry-count`, `x-failure-reason`,
  `x-failed-consumer` (dead-letter). Inspect them in the management UI,
  queue `kanban.events.dead-letter` → *Get messages*.
- The policy (`maxRetries: 3`, `delayMs: 5000`) is `DEFAULT_RETRY_POLICY` in
  `RabbitMqEventBus.ts`. Changing the delay of an existing consumer requires
  deleting its `<consumer>.retry` queue first (a queue TTL cannot change).
- Handlers must stay idempotent: a retried event is the same event.

**Publishers.** No retry: `publishSafely` logs the lost event as an error
with its id and type, and the business operation still succeeds.

**Logs.** The event workflow logs one JSON object per line, ready for the
centralized logging stack (S2-36):

```json
{"time":"2026-09-30T16:30:32.681Z","level":"warn","component":"event-bus","message":"Event processing failed, retry scheduled","eventId":"42eb…","eventType":"task.created","consumer":"notifications.task-events","attempt":2,"maxAttempts":4,"retryInMs":5000,"error":"…"}
```

| Message | Level |
| ------- | ----- |
| `Event processing failed, retry scheduled` | warn |
| `Event processed after retry` | info |
| `Event processing failed, sent to dead-letter` | error |
| `Unreadable message sent to dead-letter` | error |
| `Event lost: could not be published` | error |

Payloads are never logged (they contain user content such as task titles).
The event `id` is the correlation key between the publisher, the retries and
the dead-letter queue until tracing is added (S2-37).

## Tests

Use `InMemoryEventBus` in unit tests: same contract (JSON round trip,
handler failures isolated from the publisher), plus `published`,
`publishedOfType()` and `failures` for assertions.

```ts
const eventBus = new InMemoryEventBus();
const service = new TaskService(repository, guard, eventBus);
await service.create(…);
expect(eventBus.publishedOfType("task.created")).toHaveLength(1);
```

## Code

- `src/shared/events/DomainEvent.ts`: envelope, `createEvent`, validation
- `src/shared/events/EventBus.ts`: `EventBus` interface, subscriptions
- `src/shared/events/publishSafely.ts`: non-failing publication
- `src/shared/events/InMemoryEventBus.ts`: test implementation
- `src/shared/events/rabbitmq/RabbitMqEventBus.ts`: RabbitMQ implementation
- `src/shared/events/index.ts`: backend-wide `eventBus`
