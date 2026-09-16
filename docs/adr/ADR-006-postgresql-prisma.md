# ADR-006 — PostgreSQL and Prisma for Target Persistence

## Status

Accepted

## Date

2026-09-14

## Context

The legacy application uses SQLite or MySQL with a minimal `todo_items` model.

The target domain introduces users, authentication, projects, tasks, project membership, ownership, priorities, deadlines, notifications, and relationships that require a new relational schema.

The persistence layer is already being redesigned, so retaining the legacy database engine would create a second future migration without providing meaningful short-term value.

## Decision

The target persistence stack will be:

`Repository -> Prisma -> PostgreSQL`

PostgreSQL becomes the target relational database.

Prisma is used as the ORM and migration mechanism behind repository interfaces.

Legacy SQLite/MySQL remains part of the audited starting point but is not the target persistence architecture.

## Alternatives Considered

### Keep MySQL as the target database

Rejected because the persistence layer and schema are already being rebuilt, making this the appropriate migration boundary for moving to PostgreSQL rather than scheduling another database-engine migration later.

### Keep SQLite

Rejected because SQLite is not the intended shared production persistence layer for the target multi-user application.

### Direct SQL without ORM

Rejected because Prisma provides schema management, migrations, type-safe access, and a consistent persistence boundary for the project.

## Consequences

### Positive

- Strong relational database suited to the target domain.
- Versioned schema migrations.
- Type-safe database access.
- Repository interfaces isolate the application from persistence details.
- Avoids a second database-engine migration later.

### Negative / Trade-offs

- Requires PostgreSQL infrastructure in development, tests, and deployment.
- Team members must understand Prisma migrations and PostgreSQL behaviour.
- Legacy persistence cannot simply be reused unchanged.

## Implementation Notes

Application modules must depend on repository abstractions rather than accessing Prisma directly from controllers.

A dedicated test database should be used for integration testing.

## Related Documentation

- `docs/architecture/BACKEND_MIGRATION.md`
- `docs/standards/TESTING_CONVENTIONS.md`
- `docs/standards/NAMING_CONVENTIONS.md`

## Supersedes

None

## Superseded By

None
