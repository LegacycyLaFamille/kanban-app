# ADR-005 — REST API for Frontend/Backend Communication

## Status

Accepted

## Date

2026-09-14

## Context

The frontend and backend need a stable application contract for authentication, projects, tasks, users, notifications, and Kanban operations.

The existing application already uses HTTP endpoints, and the target architecture requires clear authorization, validation, testability, and documentation.

## Decision

Frontend/backend communication will use a REST API over HTTP with JSON payloads.

Conventions include:

- lowercase plural resources
- camelCase path parameters
- camelCase JSON properties
- standard HTTP status codes
- consistent error response structures
- OpenAPI documentation when introduced

Examples:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `POST /api/projects/:projectId/tasks`
- `PATCH /api/tasks/:taskId`

## Alternatives Considered

### GraphQL

Rejected because the project does not currently need flexible client-driven queries or the additional schema/runtime complexity.

### Direct database access from the frontend

Rejected because it would bypass authorization, validation, business rules, and service boundaries.

## Consequences

### Positive

- Simple and familiar contract.
- Easy to test with standard HTTP tooling.
- Clear mapping to business resources.
- Compatible with OpenAPI.
- Keeps frontend and backend loosely coupled.

### Negative / Trade-offs

- Some endpoints may require multiple requests for complex screens.
- API versioning and compatibility must be managed as the product evolves.

## Implementation Notes

Business logic belongs in backend services, not in controllers or frontend code.

Raw Prisma, database, or stack-trace errors must not be exposed to clients.

## Related Documentation

- `docs/standards/API_CONVENTIONS.md`
- `docs/architecture/BACKEND_MIGRATION.md`

## Supersedes

None

## Superseded By

None
