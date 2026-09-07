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

## Document Organization

### Audit

- [`audit/LEGACY_AUDIT.fr.md`](./docs/audit/LEGACY_AUDIT.fr.md)  
  Complete technical audit of the legacy repository. The current audit is maintained in French.

### Architecture and Migration

- [`architecture/FRONTEND_MIGRATION.md`](./docs/architecture/FRONTEND_MIGRATION.md)
- [`architecture/FRONTEND_MIGRATION.fr.md`](./docs/architecture/FRONTEND_MIGRATION.fr.md)
- [`architecture/BACKEND_MIGRATION.md`](./docs/architecture/BACKEND_MIGRATION.md)
- [`architecture/BACKEND_MIGRATION.fr.md`](./docs/architecture/BACKEND_MIGRATION.fr.md)

### Development Standards

Main entry point:

- [`standards/DEVELOPMENT_CONVENTIONS.md`](./docs/standards/DEVELOPMENT_CONVENTIONS.md)
- [`standards/DEVELOPMENT_CONVENTIONS.fr.md`](./docs/standards/DEVELOPMENT_CONVENTIONS.fr.md)

Detailed standards:

- [`standards/NAMING_CONVENTIONS.md`](./docs/standards/NAMING_CONVENTIONS.md)
- [`standards/NAMING_CONVENTIONS.fr.md`](./docs/standards/NAMING_CONVENTIONS.fr.md)
- [`standards/GIT_CONVENTIONS.md`](./docs/standards/GIT_CONVENTIONS.md)
- [`standards/GIT_CONVENTIONS.fr.md`](./docs/standards/GIT_CONVENTIONS.fr.md)
- [`standards/CODE_QUALITY.md`](./docs/standards/CODE_QUALITY.md)
- [`standards/CODE_QUALITY.fr.md`](./docs/standards/CODE_QUALITY.fr.md)
- [`standards/TESTING_CONVENTIONS.md`](./docs/standards/TESTING_CONVENTIONS.md)
- [`standards/TESTING_CONVENTIONS.fr.md`](./docs/standards/TESTING_CONVENTIONS.fr.md)
- [`standards/API_CONVENTIONS.md`](./docs/standards/API_CONVENTIONS.md)
- [`standards/API_CONVENTIONS.fr.md`](./docs/standards/API_CONVENTIONS.fr.md)

The `standards/` directory also contains its own index README.

## Current Key Decisions

- React is retained and progressively migrated to TypeScript.
- Node.js and Express are retained on the backend.
- The application exposes a REST API.
- The target backend uses `Controller → Service → Repository`.
- Prisma is the target ORM.
- PostgreSQL is the target persistence engine.
- Existing `todo_items` records are not automatically migrated because reliable ownership cannot be established from the legacy model.
- Users are informed before the upgrade so they can preserve relevant information and recreate still-needed tasks after account creation and authentication.
- RabbitMQ provides the event-driven workflow.
- Docker, GitHub Actions, ESLint, tests, coverage, and static quality analysis are part of the modernization.
