# Kanban Project Documentation

This directory is the entry point for the technical documentation of the incremental modernization of the legacy TodoList into the Kanban application.

## Direction

The project is treated as an enterprise legacy modernization rather than a full rewrite:

```text
Legacy audit
     ↓
Baseline and characterization tests
     ↓
Quality / CI / safety nets
     ↓
Progressive JavaScript → TypeScript migration
     ↓
Architectural refactoring
     ↓
Feature-based frontend
     ↓
Modular-monolith backend
     ↓
Prisma + PostgreSQL
     ↓
Todo → Users / Projects / Tasks / Kanban
     ↓
RabbitMQ / Event-driven
     ↓
Docker / delivery
```

Target architecture:

```text
React + TypeScript
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
   ┌────┴────┐
   ▼         ▼
Repositories Events
   │         │
   ▼         ▼
Prisma    RabbitMQ
   │
   ▼
PostgreSQL
```

The application remains a **modular monolith** and is migrated progressively.

## What the application does today

- **Landing page** on `/`: product presentation, sign in / create an account.
- **Authentication**: register, sign in, session with HTTP-only cookies and refresh, profile.
- **Projects**: CRUD, several **boards** per project, team with **EDITOR / VIEWER** roles and **invitations**.
- **Kanban**: one board per page, drag and drop (with a keyboard alternative), priorities, deadlines, assignment, coloured task cards.
- **My Tasks**, **notifications** (event-driven, RabbitMQ), **data export**, **admin dashboard**.
- **Accessibility**: RGAA checklist, automated axe audit of every page, colour-blind palette.
- **Observability**: OpenTelemetry, Prometheus, Loki, Tempo, Grafana.
- The legacy TodoList is still available on `/legacy`.

Not done yet: change password and account deletion (the profile buttons exist, the backend routes do not), the accessibility statement, frontend tests in CI.

Route by route: [docs/frontend/FEATURES.md](./docs/frontend/FEATURES.md).

## Getting Started

- Backend (API, PostgreSQL, RabbitMQ): [docs/backend/Get_started.md](./docs/backend/Get_started.md)
- Frontend: [frontend/README.md](./frontend/README.md)
- Whole stack with Docker: set `JWT_SECRET` and `RABBITMQ_PASSWORD` in a root `.env`, run `docker compose up -d`, then open <http://localhost:8080>
- New team member: [docs/team/ONBOARDING.md](./docs/team/ONBOARDING.md)

## Document Organization

### Audit

- [`audit/LEGACY_AUDIT.md`](./docs/audit/LEGACY_AUDIT.md) — technical audit of the legacy repository (also in [French](./docs/audit/LEGACY_AUDIT.fr.md)).

### Architecture and decisions

- [`architecture/FRONTEND_MIGRATION.md`](./docs/architecture/FRONTEND_MIGRATION.md) — frontend migration strategy and current state
- [`architecture/BACKEND_MIGRATION.md`](./docs/architecture/BACKEND_MIGRATION.md) — backend migration strategy, data model, authorization
- [`adr/`](./docs/adr/README.md) — Architecture Decision Records (ADR-001 to ADR-010)

### Backend

- [`backend/Get_started.md`](./docs/backend/Get_started.md) — local setup, database updates
- [`backend/PROJECTS_AND_ACCESS.md`](./docs/backend/PROJECTS_AND_ACCESS.md) — roles, invitations, boards, assignment
- [`backend/EVENTS.md`](./docs/backend/EVENTS.md) — domain events and the event bus
- [`backend/RABBITMQ.md`](./docs/backend/RABBITMQ.md) — RabbitMQ configuration and topology
- [`backend/NOTIFICATIONS.md`](./docs/backend/NOTIFICATIONS.md) — who is notified, API, frontend
- [`backend/ADMIN_ROLE.md`](./docs/backend/ADMIN_ROLE.md) — system admin role
- [`backend/DATA_EXPORT.md`](./docs/backend/DATA_EXPORT.md) — user data export
- [`backend/LEGACY_DATA_MIGRATION.md`](./docs/backend/LEGACY_DATA_MIGRATION.md) — archiving legacy todos
- [`backend/OBSERVABILITY.md`](./docs/backend/OBSERVABILITY.md), [`backend/OBSERVABILITY_DEMO.md`](./docs/backend/OBSERVABILITY_DEMO.md) — metrics, logs, traces, dashboards
- [`backend/INTEGRATION_TESTS.md`](./docs/backend/INTEGRATION_TESTS.md) — tests against real PostgreSQL and RabbitMQ
- API reference: `backend/docs/openapi.yaml`, served at `/api-docs`

### Frontend

- [`frontend/FEATURES.md`](./docs/frontend/FEATURES.md) — routes, features, landing page, task colours, colour-blind palette
- [`frontend/TESTING.md`](./docs/frontend/TESTING.md) — unit and E2E tests

### Standards

Entry point: [`standards/DEVELOPMENT_CONVENTIONS.md`](./docs/standards/DEVELOPMENT_CONVENTIONS.md) (index: [`standards/README.md`](./docs/standards/README.md)).

- [`standards/NAMING_CONVENTIONS.md`](./docs/standards/NAMING_CONVENTIONS.md)
- [`standards/GIT_CONVENTIONS.md`](./docs/standards/GIT_CONVENTIONS.md)
- [`standards/CODE_QUALITY.md`](./docs/standards/CODE_QUALITY.md)
- [`standards/TESTING_CONVENTIONS.md`](./docs/standards/TESTING_CONVENTIONS.md)
- [`standards/API_CONVENTIONS.md`](./docs/standards/API_CONVENTIONS.md)
- [`standards/ACCESSIBILITY_RGAA.md`](./docs/standards/ACCESSIBILITY_RGAA.md) — accessibility rules, audit, known gaps
- [`standards/ACCESSIBILITY_STATEMENT.md`](./docs/standards/ACCESSIBILITY_STATEMENT.md) — accessibility statement (draft)

### Quality and team

- [`quality-gate.md`](./docs/quality-gate.md) — CI checks, coverage, SonarQube
- [`team/ONBOARDING.md`](./docs/team/ONBOARDING.md) — team organization and onboarding
- [`benchmarks/benchmarks_report.md`](./docs/benchmarks/benchmarks_report.md) — technology benchmarks

Every document under `adr/`, `architecture/`, `standards/` and `team/` has a French version (`.fr.md`).

## Current Key Decisions

- React is retained and progressively migrated to TypeScript.
- Node.js and Express are retained on the backend.
- The application exposes a REST API.
- The target backend uses `Controller → Service → Repository`.
- Prisma is the target ORM.
- PostgreSQL is the target persistence engine.
- Existing `todo_items` records are not migrated into users' projects because reliable ownership cannot be established from the legacy model; they are kept in a read-only `LegacyTodoItem` archive.
- Users are informed before the upgrade so they can preserve relevant information and recreate still-needed tasks after account creation and authentication.
- RabbitMQ provides the event-driven workflow.
- Project access is decided in one place (`ProjectAccessGuard`): owner, EDITOR and VIEWER roles.
- The landing page is served on `/`, the legacy app on `/legacy` (ADR-010, proposed).
- Docker, GitHub Actions, ESLint, tests, coverage, and static quality analysis are part of the modernization.
