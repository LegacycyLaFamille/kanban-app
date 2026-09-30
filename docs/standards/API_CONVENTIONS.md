# API and Backend Conventions

## 1. Purpose

This document defines the backend and REST API conventions for the Kanban rework project.

The application is modernized incrementally from the existing legacy system. The target backend remains based on **Node.js and Express**, with a progressive migration from JavaScript to TypeScript.

The target architecture is a **modular monolith**, not a microservices architecture.

---

## 2. Target Architecture

```text
React Frontend
      │
      │ REST / JSON
      ▼
Node.js + Express + TypeScript
      │
      ▼
Controllers
      │
      ▼
Services
      │
      ├────────────────┐
      ▼                ▼
Repositories         Events
      │                │
      ▼                ▼
Prisma             RabbitMQ
      │
      ▼
PostgreSQL
```

The migration must remain incremental. Legacy JavaScript and the existing persistence implementation may temporarily coexist with the target architecture while modules are migrated.

---

## 3. REST API and Prisma

REST and Prisma solve different problems and are both used.

### REST API

The REST API is the interface exposed by the backend to the frontend.

It is responsible for:

- receiving HTTP requests;
- exposing application resources;
- applying authentication middleware;
- validating request data;
- returning controlled HTTP responses.

### Prisma

Prisma is the ORM used inside the backend persistence layer.

It is responsible for:

- querying PostgreSQL;
- managing relationships;
- transactions;
- schema definition;
- database migrations.

The frontend must never access Prisma directly.

---

## 4. Layer Responsibilities

### Routes

Routes declare HTTP endpoints and middleware.

They must remain thin and delegate processing to controllers.

### Controllers

Controllers handle HTTP-specific concerns:

- route parameters;
- validated request data;
- authentication context;
- service calls;
- HTTP responses.

Controllers must not contain SQL, Prisma queries, or business rules.
  
### Services

Services contain application and business logic:

- authentication;
- authorization;
- project ownership;
- task lifecycle;
- Kanban status transitions;
- domain-event publication.

Services must not depend directly on Express.

### Repositories

Repositories encapsulate persistence access.

During the transition, a repository may temporarily wrap the legacy persistence implementation. The target implementation uses Prisma.

```text
Service
   ↓
Repository
   ├── legacy persistence   (temporary)
   └── Prisma               (target)
          ↓
        PostgreSQL
```

Business services must not contain Prisma-specific queries.

---

## 5. Resource Naming

Use lowercase plural nouns:

```text
/api/users
/api/projects
/api/tasks
/api/notifications
```

Use nested resources where the relationship is meaningful:

```text
/api/projects/:projectId/tasks
```

Avoid action verbs in resource names.

Avoid:

```text
POST /api/createTask
GET  /api/getProjects
```

Prefer:

```text
POST /api/tasks
GET  /api/projects
```

---

## 6. HTTP Methods

| Operation | Method |
|---|---|
| Create | `POST` |
| Read collection | `GET` |
| Read resource | `GET` |
| Partial update | `PATCH` |
| Delete | `DELETE` |

Projects:

```text
POST   /api/projects
GET    /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
```

Tasks:

```text
POST   /api/projects/:projectId/tasks
GET    /api/projects/:projectId/tasks
GET    /api/tasks/:taskId
PATCH  /api/tasks/:taskId
DELETE /api/tasks/:taskId
```

---

## 7. HTTP Status Codes

Use standard HTTP semantics consistently.

| Code | Meaning |
|---:|---|
| `200` | Success |
| `201` | Resource created |
| `204` | Success with no response body |
| `400` | Invalid request |
| `401` | Missing or invalid authentication |
| `403` | Authenticated but forbidden |
| `404` | Resource not found |
| `409` | Conflict |
| `422` | Semantically invalid input when adopted by the endpoint convention |
| `500` | Unexpected server error |

Known application errors must not be returned as `200`.

---

## 8. Error Format

Use one predictable structure:

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found"
  }
}
```

Validation errors may include field details:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {
      "name": ["Name is required"]
    }
  }
}
```

Never expose stack traces, raw Prisma errors, SQL errors, or credentials.

---

## 9. Authentication and Authorization

Authentication answers:

> Who is the user?

Authorization answers:

> Is this user allowed to perform this operation?

Authorization must be enforced by the backend, primarily in the service/domain layer.

Frontend visibility rules are never considered a security boundary.

New business data must be created in an authenticated and authorized context.

### System-wide roles

`User.role` (`USER` | `ADMIN`, defaults to `USER`) is a system-wide role,
orthogonal to per-project ownership/membership (`ProjectAccessGuard`,
`Project.ownerId`, `ProjectMember`): a user can be an app-wide admin while
still being just a member — or nothing at all — on any given project. The
two authorization systems never overlap and are checked independently.

`requireAdmin(userRepository)` (`backend/src/shared/security/requireAdmin.ts`)
is the reusable guard for "is this user an admin" checks, following the same
shape as `ProjectAccessGuard`: it looks the role up fresh from the database
on every request rather than trusting a JWT claim, so a promotion or
demotion takes effect immediately. It must run after `requireAuth` in the
middleware chain (it reads `req.userId`, which `requireAuth` sets) and
rejects with the standard error shape from §8:

```json
{ "error": { "code": "FORBIDDEN", "message": "This action requires administrator access." } }
```

`GET /auth/me` includes `role` in its response, alongside `id`/`email`/`name`/`createdAt`.

There is no admin-management UI yet — promoting the first admin is a manual
step, see [`../backend/ADMIN_ROLE.md`](../backend/ADMIN_ROLE.md).

### Admin dashboard endpoints

Every route under `/admin` requires `requireAuth` + `requireAdmin`, in that
order:

```text
GET   /admin/tasks                    all tasks across all projects, grouped by project
PATCH /admin/tasks/:taskId/assignee   set (assigneeId: <uuid>) or clear (assigneeId: null) a task's assignee
```

`GET /admin/tasks` returns tasks grouped by project (not a flat list), each
group carrying its `assignableUsers` (owner + members) so the frontend can
render the assignment control without a second request per project — see
`backend/src/modules/admin/AdminTask.ts` for the exact shape.

**Assignment permission decision:** a task may only be assigned to a user
who already has access to its project (the owner or an existing
`ProjectMember`). Assigning to someone with no project access would create
a task nobody but an admin could ever see or act on, breaking the
`ProjectAccessGuard` invariant that only a project's owner/members may view
or act on its tasks. Rejected with `400 ASSIGNEE_NOT_PROJECT_MEMBER`. To
assign to someone new, add them as a project member first via the existing
`POST /projects/:projectId/members`.

---

## 10. Input Validation

Validate every external input before it reaches business logic:

- request bodies;
- route parameters;
- query parameters;
- environment variables;
- event payloads.

A schema validation library such as Zod may be used.

Target flow:

```text
HTTP Request
    ↓
Schema Validation
    ↓
Controller
    ↓
Service
```

Implemented as a shared `validateSchema(schema)` Express middleware
(`backend/src/shared/http/validateSchema.ts`), applied per route ahead of the
controller. Each module colocates its own Zod schemas next to its service
(e.g. `backend/src/modules/projects/project.schema.ts`). A schema failure
short-circuits with the `VALIDATION_ERROR` shape from §8 and never reaches
the controller or service.

---

## 11. Prisma and PostgreSQL

The legacy application currently relies on SQLite or MySQL persistence. The target architecture deliberately standardizes the rebuilt data layer on **PostgreSQL**.

This is a controlled technology upgrade rather than a prerequisite for the architectural refactor. The decision is justified because:

- the target domain requires a new relational schema for users, projects, tasks, authorization, and notifications;
- legacy business records are not automatically migrated because their ownership cannot be established reliably;
- the database layer is therefore already being rebuilt and versioned;
- moving to PostgreSQL at this boundary avoids performing a second database-engine migration later.

Prisma is introduced progressively as the target ORM.

```text
Legacy persistence
SQLite / MySQL
        ↓
Repository migration boundary
        ↓
Prisma
        ↓
PostgreSQL
```

The rest of the application must remain isolated from the database engine through repositories.

Use Prisma transactions when multiple persistence operations must succeed or fail together.

Database schema changes must be versioned through Prisma migrations.

---

## 12. Legacy Business Data

Existing legacy `todo_items` are **not automatically migrated** into the authenticated Kanban domain.

The legacy model contains no user or ownership relationship, so the application cannot reliably determine which future user should own each record.

The system must not:

- assign legacy tickets arbitrarily;
- expose all legacy tickets to every new user;
- invent ownership information.

Users must be informed before the upgrade and given time to preserve relevant information. Relevant tasks can then be recreated after account creation and authentication.

The complete rationale is documented in:

- [`../architecture/BACKEND_MIGRATION.md`](../architecture/BACKEND_MIGRATION.md)
- [`../architecture/BACKEND_MIGRATION.fr.md`](../architecture/BACKEND_MIGRATION.fr.md)

---

## 13. Domain Events and RabbitMQ

Domain events are published after the relevant business operation succeeds.

Example:

```text
POST /api/tasks
      ↓
TaskController
      ↓
TaskService
      ├── persist through Repository / Prisma
      └── publish task.created
                    ↓
                 RabbitMQ
                    ↓
          Notification Consumer
```

RabbitMQ is supporting infrastructure introduced to satisfy asynchronous and event-driven requirements. It does not turn the application into microservices.

---

## 14. OpenAPI

The REST API should be documented with OpenAPI once the endpoint set is sufficiently stable.

Documentation should include:

- endpoints;
- request schemas;
- response schemas;
- authentication;
- status codes;
- error formats.

OpenAPI documentation does not replace automated tests.
