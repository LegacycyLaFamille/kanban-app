# API and Backend Conventions

## Architecture
The project uses a **modular monolith**, not microservices.

```text
React Frontend
     │ HTTP / JSON
     ▼
REST API / Express
     ▼
Controllers
     ▼
Services
     ▼
Repositories
     ▼
Prisma ORM
     ▼
PostgreSQL
```

RabbitMQ is used separately for asynchronous event-driven workflows.

## Layer responsibilities

### Controller
Handles HTTP-specific concerns and calls a service. It contains no persistence logic.

### Service
Contains business rules, authorization rules, orchestration, and domain event publication.

### Repository
Encapsulates persistence access and Prisma queries.

### Prisma
Infrastructure mechanism used by repositories to communicate with PostgreSQL.

## REST resource naming
Use plural resources:
```text
/api/users
/api/projects
/api/tasks
/api/notifications
```

Nested tasks:
```text
/api/projects/:projectId/tasks
```

## HTTP methods
- `POST` create
- `GET` read
- `PATCH` partial update
- `DELETE` delete

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

## HTTP status codes
- `200` success
- `201` created
- `204` success without body
- `400` invalid request
- `401` authentication required/invalid
- `403` forbidden
- `404` not found
- `409` conflict
- `500` unexpected server error

## Error format
Recommended:
```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found"
  }
}
```

Do not expose stack traces or raw database errors.

## Authentication and authorization
Authentication answers: **Who is the user?**

Authorization answers: **May this user perform this operation?**

Authorization rules belong in the backend service/domain layer, not only in the frontend.

## Transactions
Use Prisma transactions when multiple database operations must succeed or fail together.

## Events
Example:
```text
POST /api/tasks
      ↓
TaskService
      ├── persist through Repository / Prisma
      └── publish task.created
                    ↓
                 RabbitMQ
```

## OpenAPI
Document endpoints, schemas, authentication, status codes, and error responses using OpenAPI when implemented.
