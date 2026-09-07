# Development Conventions

## 1. Purpose

This document is the entry point for development conventions and is the concrete reference for **S1-04 — Define development conventions**.

The project follows an incremental legacy-modernization strategy rather than a full rewrite.

---

## 2. Architectural Direction

### Frontend

```text
React + JavaScript legacy
        ↓ progressive migration
React + TypeScript
Feature-based architecture
```

Detailed strategy:

- [`../architecture/FRONTEND_MIGRATION.md`](../architecture/FRONTEND_MIGRATION.md)
- [`../architecture/FRONTEND_MIGRATION.fr.md`](../architecture/FRONTEND_MIGRATION.fr.md)

### Backend

```text
Node.js + Express + JavaScript legacy
        ↓ progressive migration
Node.js + Express + TypeScript
Controllers → Services → Repositories → Prisma → PostgreSQL
                           └────────────→ RabbitMQ events
```

Detailed strategy:

- [`../architecture/BACKEND_MIGRATION.md`](../architecture/BACKEND_MIGRATION.md)
- [`../architecture/BACKEND_MIGRATION.fr.md`](../architecture/BACKEND_MIGRATION.fr.md)

The target application remains a **modular monolith**.

---

## 3. Mandatory Standards

All contributors must follow:

1. [Naming Conventions](NAMING_CONVENTIONS.md)
2. [Git Conventions](GIT_CONVENTIONS.md)
3. [Code Quality Standards](CODE_QUALITY.md)
4. [Testing Conventions](TESTING_CONVENTIONS.md)
5. [API and Backend Conventions](API_CONVENTIONS.md)

---

## 4. S1-04 Coverage

S1-04 is satisfied when the team has documented and agreed on:

- source-code and file naming;
- feature-based frontend organization;
- backend layer responsibilities;
- progressive JavaScript → TypeScript migration;
- REST API conventions;
- Prisma + PostgreSQL persistence conventions;
- event/RabbitMQ conventions;
- Git branches and Conventional Commits;
- Pull Request and review rules;
- merge strategy;
- linting and type checking;
- testing strategy and characterization tests;
- coverage expectations;
- CI/quality requirements;
- Definition of Done alignment.

---

## 5. Migration Rules

- Do not rewrite the application in one operation.
- Keep the application runnable throughout major migration steps.
- Prefer small, focused Pull Requests.
- Protect legacy behavior with characterization tests before risky refactors.
- New code should use the target architecture.
- Legacy code is migrated when modified or replaced.
- Do not remove legacy code before its replacement is validated.
- Do not invent ownership for legacy business data.

---

## 6. Enforcement

These conventions are enforced through:

- peer review;
- GitHub branch protection;
- ESLint;
- TypeScript checks;
- automated tests;
- coverage;
- static code-quality analysis;
- GitHub Actions.

Intentional deviations must be justified and documented.
