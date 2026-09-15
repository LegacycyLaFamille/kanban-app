# ADR-002 — Modular Monolith Backend Architecture

## Status

Accepted

## Date

2026-09-14

## Context

The target application introduces several business areas: authentication, users, projects, tasks, notifications, persistence, and event-driven workflows.

The team needs clear business boundaries and maintainable code without introducing the operational complexity of distributed microservices during a short delivery period.

## Decision

The backend will use a modular monolith architecture.

Business capabilities are organized into explicit modules such as:

- `auth`
- `users`
- `projects`
- `tasks`
- `notifications`

Within a business module, the preferred dependency direction is:

`Controller -> Service / Use Case -> Repository -> Prisma -> PostgreSQL`

Shared infrastructure such as configuration, database access, messaging, and middleware remains outside business modules where appropriate.

RabbitMQ is supporting infrastructure and does not turn the application into a microservice architecture.

## Alternatives Considered

### Microservices

Rejected because the current scope does not justify independent deployment, network communication, distributed transactions, service discovery, or separate operational ownership.

### Unstructured monolith

Rejected because it would reproduce the coupling and maintainability problems the modernization is intended to reduce.

## Consequences

### Positive

- Clear business boundaries.
- Simpler deployment than microservices.
- Easier local development and testing.
- Modules can evolve independently inside one deployable application.
- Architecture remains compatible with future extraction if a real need appears.

### Negative / Trade-offs

- Modules still share one application process.
- Architectural boundaries must be enforced by conventions and reviews.
- Poorly designed shared code can recreate coupling.

## Implementation Notes

Modules must communicate through explicit interfaces or application-level services rather than directly reaching into another module's persistence implementation.

The backend should remain stateless where practical so that horizontal scaling remains possible later without being required now.

## Related Documentation

- `docs/architecture/BACKEND_MIGRATION.md`
- `docs/standards/DEVELOPMENT_CONVENTIONS.md`

## Supersedes

None

## Superseded By

None
