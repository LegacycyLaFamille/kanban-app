# Naming Conventions

## 1. General Rules

- Use English for source code, file names, API routes, database identifiers, events, branches, commits, and Pull Requests.
- Prefer explicit names over abbreviations.
- Use the same domain vocabulary everywhere: `User`, `Project`, `Task`, `Notification`.
- New TypeScript code follows these conventions immediately; legacy JavaScript is aligned progressively when migrated or modified.

---

## 2. Frontend

The target frontend is feature-based.

```text
src/
├── app/
├── features/
│   ├── auth/
│   ├── projects/
│   ├── tasks/
│   ├── kanban/
│   ├── users/
│   └── notifications/
└── shared/
```

### Components

Use `PascalCase`:

```text
TaskCard.tsx
KanbanBoard.tsx
LoginForm.tsx
```

Component names must match file names.

### Hooks

Use `camelCase` with the `use` prefix:

```text
useTasks.ts
useProjects.ts
useAuth.ts
```

### Feature API Files

Use the domain name followed by `.api.ts`:

```text
tasks.api.ts
projects.api.ts
auth.api.ts
```

### Functions and Variables

Use `camelCase`:

```text
createTask()
loadProjects()
projectId
currentUser
```

### Constants

Use `UPPER_SNAKE_CASE` for application-wide constants:

```text
MAX_LOGIN_ATTEMPTS
DEFAULT_PAGE_SIZE
```

### Types

Use `PascalCase`:

```text
Task
Project
CreateTaskInput
TaskStatus
```

Do not prefix interfaces with `I`.

---

## 3. Backend

Business modules use lowercase plural or domain names:

```text
auth/
users/
projects/
tasks/
notifications/
```

Use `PascalCase` for classes and exported types:

```text
TaskController
TaskService
TaskRepository
```

Use dot-separated lowercase file roles:

```text
task.routes.ts
task.controller.ts
task.service.ts
task.repository.ts
task.schema.ts
```

---

## 4. REST API

Use lowercase plural resources:

```text
/api/users
/api/projects
/api/tasks
/api/notifications
```

Use `camelCase` for route parameters:

```text
:projectId
:taskId
:userId
```

JSON properties use `camelCase`.

Avoid verbs in resource names.

---

## 5. Prisma and PostgreSQL

Prisma models use singular `PascalCase`:

```text
User
Project
Task
Notification
```

Prisma fields use `camelCase`:

```text
createdAt
updatedAt
projectId
ownerId
```

PostgreSQL table and column names use `snake_case`.

Tables use plural names:

```text
users
projects
tasks
notifications
project_members
```

Columns:

```text
created_at
updated_at
project_id
owner_id
```

Recommended Prisma mapping:

```prisma
model Project {
  id        String   @id @default(uuid())
  createdAt DateTime @map("created_at")

  @@map("projects")
}
```

Explicit index/constraint names should be descriptive:

```text
idx_tasks_project_id
idx_tasks_status
uq_users_email
fk_tasks_project_id
```

---

## 6. Events and RabbitMQ

Domain events use:

```text
<domain>.<action>
```

Examples:

```text
task.created
task.updated
task.completed
project.created
user.deleted
```

Use lowercase names and avoid technical implementation details.

RabbitMQ queues use descriptive lowercase names:

```text
notifications.task-created
notifications.task-completed
```

Suggested exchange:

```text
domain-events
```

---

## 7. Environment Variables

Use `UPPER_SNAKE_CASE`:

```text
DATABASE_URL
DATABASE_URL_TEST
RABBITMQ_URL
JWT_SECRET
NODE_ENV
PORT
```

Secrets must never be committed.

---

## 8. Docker

Use lowercase service names:

```text
frontend
backend
postgres
rabbitmq
```

Image names remain lowercase:

```text
kanban-app-frontend
kanban-app-backend
```

---

## 9. Tests

Unit:

```text
task.service.test.ts
auth.service.test.ts
```

Integration:

```text
tasks.integration.test.ts
events.integration.test.ts
```

E2E:

```text
authentication.e2e.test.ts
kanban-workflow.e2e.test.ts
```

Test descriptions must describe observable behavior.

---

## 10. GitHub Issues

Use the sprint identifier followed by an action:

```text
S1-17 — Implement login
S2-20 — Implement Kanban status rules
```

---

## 11. Branches

Branch rules are defined in `GIT_CONVENTIONS.md`.

Example:

```text
feature/S1-17-login
```
