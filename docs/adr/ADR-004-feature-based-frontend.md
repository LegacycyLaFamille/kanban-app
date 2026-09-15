# ADR-004 — Feature-Based Frontend Architecture

## Status

Accepted

## Date

2026-09-14

## Context

The target frontend contains several independent business capabilities such as authentication, projects, tasks, Kanban, users, and notifications.

A structure organized only by technical type (`components/`, `hooks/`, `services/`) would mix unrelated domains as the application grows.

## Decision

The frontend will use a feature-based architecture.

Top-level source responsibilities are:

- `app/`: application shell, routing, providers, layouts, temporary legacy boundary
- `features/`: business features
- `shared/`: reusable technical or UI elements that do not belong to one business feature
- `styles/`: global styles and application-wide style foundations

Each feature may contain its own:

- `api/`
- `components/`
- `hooks/`
- `pages/`
- `schemas/`
- `types/`

Component-specific CSS Modules should be colocated with the component.

## Alternatives Considered

### Global folders by technical type

Rejected because components, hooks, APIs, and types from unrelated business domains would become mixed as the product grows.

### One large application folder

Rejected because it would make ownership and dependency boundaries unclear.

## Consequences

### Positive

- Business ownership is easy to understand.
- Feature code can evolve independently.
- Related files are colocated.
- Progressive legacy replacement is easier.
- Shared code remains intentionally limited.

### Negative / Trade-offs

- Some repeated structure exists between features.
- Developers must decide carefully whether code belongs to a feature or to `shared/`.

## Implementation Notes

Code should be placed in `shared/` only when it is genuinely reusable across multiple features and does not belong to one domain.

Feature code must not depend on internal implementation details of unrelated features.

## Related Documentation

- `docs/architecture/FRONTEND_MIGRATION.md`
- `docs/standards/NAMING_CONVENTIONS.md`

## Supersedes

None

## Superseded By

None
