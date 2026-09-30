# Notifications

In-app notifications are produced asynchronously from task events: the HTTP
request that changes a task never writes notifications itself.

```text
PATCH /tasks/:id ──► TaskService ──► task.completed ──► RabbitMQ (kanban.events)
                                                              │
                                    queue notifications.task-events
                                                              │
                     NotificationService ◄── notification consumer
                              │
                        Notification rows (PostgreSQL)
```

## Which events notify whom

| Event            | Notified | Why                                              |
| ---------------- | -------- | ------------------------------------------------ |
| `task.created`   | yes      | A new task appears in a shared project           |
| `task.completed` | yes      | A task reached `DONE`                            |
| `task.updated`   | no       | Every drag-and-drop would create a notification  |

Recipients: everyone with access to the project, i.e. the owner and the
members (`ProjectMember`), **except the user who triggered the event**
(`actorId`). The owner is only notified once even if also listed as a member.
If the project was deleted before the event is processed, nothing is created.

## Data

`Notification` table, one row per (event, recipient):

| Column      | Content                                                     |
| ----------- | ----------------------------------------------------------- |
| `userId`    | Recipient (deleted with the user)                           |
| `type`      | Source event type, e.g. `task.completed`                    |
| `eventId`   | Source event id                                             |
| `actorId`   | User who acted, `null` for system events                    |
| `projectId` | Project (notifications are deleted with the project)        |
| `taskId`    | Task, kept as a plain id: the notification survives the task |
| `taskTitle` | Title at the time of the event                              |
| `readAt`    | `null` until read                                           |
| `createdAt` | When the event happened (`occurredAt`)                      |

The frontend builds the text from `type`, `taskTitle` and the actor, so no
user-generated HTML is stored.

## Duplicate deliveries

RabbitMQ delivers at least once, so the same event can arrive twice. The
unique index on `(eventId, userId)` and `createMany({ skipDuplicates: true })`
make a second delivery insert nothing. The consumer logs it:

```text
[notifications] task.completed 96c9…: 0 created for 1 recipient(s) (1 already existed)
```

## Failures

- Broker down when the task changes: the task is still saved, the event is
  logged as lost (`[event-bus] Event lost: …`), no notification is created.
- Consumer error (e.g. database down): the message goes to
  `kanban.events.dead-letter` with the event id in the logs.

Retries and replay from the dead-letter queue are covered by S2-28.

## Code

- `src/modules/tasks/task.events.ts`: task event types
- `src/modules/notifications/NotificationService.ts`: recipients and creation
- `src/modules/notifications/PrismaNotificationRepository.ts`: idempotent insert
- `src/modules/notifications/notification.consumer.ts`: subscription, started
  in `src/main.ts`
