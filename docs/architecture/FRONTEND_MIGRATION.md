# Frontend Legacy Migration to the Target Architecture

## 1. Objective

The objective is not to completely rewrite the existing frontend, but to modernize it progressively while keeping the application functional throughout the migration.

The current frontend is based on React and JavaScript. The target architecture keeps React while progressively introducing:

- TypeScript;
- a feature-based architecture;
- a clear separation between pages, components, business logic, and API calls;
- centralized communication with the REST API;
- automated tests and quality checks.

The selected approach is therefore an **incremental migration**, suitable for a legacy enterprise application.

---

## 2. Target Architecture

```text
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── providers/
│   │   └── layouts/
│   ├── features/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── kanban/
│   │   ├── users/
│   │   └── notifications/
│   ├── shared/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── constants/
│   │   └── types/
│   ├── styles/
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

- `app/`: application initialization, routing, providers, and global layouts.
- `features/`: business features organized by domain.
- `shared/`: reusable elements independent from a specific business domain.
- `api/`: REST calls specific to each feature.
- `hooks/`: frontend orchestration logic.
- `components/`: visual components.
- `pages/`: routable screens.
- `schemas/`: data validation.
- `types/`: TypeScript types related to the domain.

---

## 3. Migration Principle

```text
Legacy React / JavaScript
        ↓
Introduction of TypeScript
        ↓
Creation of the new frontend structure
        ↓
Feature-by-feature migration
        ↓
Progressive removal of replaced legacy code
```

The project must remain runnable after each significant migration step.

---

## 4. Migration Steps

### Step 1 — Stabilize the Existing Frontend

Before any major migration:

- identify current behavior;
- add or keep the necessary tests;
- configure ESLint and quality checks;
- verify that the CI works;
- document the affected legacy components.

The objective is to establish a safety net before changing the architecture.

### Step 2 — Introduce TypeScript Progressively

JavaScript and TypeScript files may temporarily coexist.

New code should be written in TypeScript whenever possible. Legacy components are migrated when they are modified or replaced.

### Step 3 — Introduce the Target Structure

Create the following directories:

```text
app/
features/
shared/
```

Responsibilities are moved progressively into the appropriate domains without performing an unnecessary large-scale refactor.

### Step 4 — Centralize API Calls

HTTP calls must no longer be scattered directly across components.

Target flow:

```text
Page
 ↓
Feature Component
 ↓
Hook
 ↓
Feature API
 ↓
Shared HTTP Client
 ↓
Backend REST API
```

Example:

```text
KanbanPage
   ↓
KanbanBoard
   ↓
useTasks()
   ↓
tasks.api.ts
   ↓
httpClient.ts
   ↓
GET /api/projects/:projectId/tasks
```

### Step 5 — Migrate Business Features

Recommended order:

1. Authentication;
2. Projects;
3. Tasks;
4. Kanban;
5. Users;
6. Notifications.

Each feature should be migrated independently in order to limit risk and keep Pull Requests small.

### Step 6 — Remove Replaced Legacy Code

A legacy section must only be removed when:

- its replacement is functional;
- tests pass;
- CI is successful;
- the Pull Request is approved;
- no active dependency still relies on it.

---

## 5. State Management

Global state must remain limited to truly global data, for example:

- authenticated user;
- session state;
- global notifications.

Feature-specific data should remain inside the relevant feature whenever possible.

The objective is to avoid introducing a global store that unnecessarily centralizes all application state.

---

## 6. Migration Rules

- no complete frontend rewrite;
- small and focused Pull Requests;
- application remains functional after each step;
- TypeScript is used for new code whenever possible;
- tests are added or updated with each migrated feature;
- no legacy code is removed before its replacement is validated;
- project naming, Git, testing, and code-quality conventions must be respected.

---

## 7. Expected Result

At the end of the migration, the frontend should be:

- organized by feature;
- mostly or fully written in TypeScript;
- connected to the REST API through a dedicated API layer;
- testable;
- maintainable;
- evolvable;
- progressively cleaned of obsolete legacy code.

The migration must demonstrate a **controlled modernization of the existing system**, not the creation of a separate replacement application.
