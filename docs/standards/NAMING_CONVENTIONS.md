# Naming Conventions

## General rules
- Use English for source code, file names, API routes, database identifiers, events, branches, commits, and Pull Requests.
- Prefer explicit names over abbreviations.
- Use domain vocabulary consistently: `User`, `Project`, `Task`, `Notification`.

## Frontend
- React components: `PascalCase` — `TaskCard.tsx`
- Hooks: `camelCase` prefixed with `use` — `useTasks.ts`
- Functions and variables: `camelCase` — `createTask`, `projectId`
- Global constants: `UPPER_SNAKE_CASE` — `MAX_LOGIN_ATTEMPTS`
- Types and interfaces: `PascalCase` — `Task`, `CreateTaskInput`
- Do not prefix interfaces with `I`.

## Backend
Classes and exported types use `PascalCase`:
- `TaskController`
- `TaskService`
- `TaskRepository`

Recommended file names:
- `task.controller.ts`
- `task.service.ts`
- `task.repository.ts`
- `task.schema.ts`
- `task.routes.ts`

Module directories use lowercase domain names:
`auth/`, `users/`, `projects/`, `tasks/`, `notifications/`.

## REST API
Use lowercase plural nouns:
- `/api/users`
- `/api/projects`
- `/api/tasks`
- `/api/notifications`

Nested resources:
`/api/projects/:projectId/tasks`

Path parameters and JSON properties use `camelCase`.

Avoid verbs in route names:
- Avoid `POST /api/createTask`
- Prefer `POST /api/tasks`

## Prisma and PostgreSQL
Prisma models use singular `PascalCase`:
`User`, `Project`, `Task`, `Notification`.

Prisma fields use `camelCase`:
`createdAt`, `projectId`, `ownerId`.

PostgreSQL tables and columns use `snake_case`:
- tables: `users`, `projects`, `tasks`, `notifications`
- columns: `created_at`, `project_id`, `owner_id`

Recommended Prisma mapping:
```prisma
model Project {
  id        String   @id @default(uuid())
  createdAt DateTime @map("created_at")

  @@map("projects")
}
```

Indexes and constraints:
- `idx_tasks_project_id`
- `uq_users_email`
- `fk_tasks_project_id`

## Events and RabbitMQ
Domain events use `<domain>.<action>`:
- `task.created`
- `task.updated`
- `task.completed`
- `project.created`

RabbitMQ queues use descriptive lowercase names:
- `notifications.task-created`
- `notifications.task-completed`

## Environment variables
Use `UPPER_SNAKE_CASE`:
`DATABASE_URL`, `RABBITMQ_URL`, `JWT_SECRET`, `NODE_ENV`.

## Docker
Compose services and image names remain lowercase:
`frontend`, `backend`, `postgres`, `rabbitmq`.

## Tests
- Unit: `task.service.test.ts`
- Integration: `tasks.integration.test.ts`
- E2E: `kanban-workflow.e2e.test.ts`

Test descriptions must describe observable behaviour.

## GitHub Issues
Format:
`S1-17 — Implement login`

## Branches
See `GIT_CONVENTIONS.md`.

Example:
`feature/S1-17-login`
