# Complete Technical Audit — Legacy TodoList Application

**Audited project:** `getting-started-app` / Legacy TodoList base  
**Audit date:** 02/09/2026  
**Scope:** provided source archive (`getting-started-app.zip`)  
**Objective:** establish a factual baseline before the rework toward the Kanban application.

---

## 1. Executive Summary

The audited repository is a **very simple monolithic TodoList application**, originating from the `docker/getting-started-app` demonstration project. It combines within a single Node.js process:

- an Express HTTP server;
- a minimal CRUD API for Todo items;
- static frontend file serving;
- a persistence layer selecting either SQLite or MySQL;
- an old React frontend delivered through precompiled/vendored JavaScript files and JSX transpiled directly in the browser using Babel Standalone.

Functionally, the application is limited to four operations: listing, creating, updating, and deleting `todo_items`. It currently contains **no authentication, no users, no projects, no real Kanban task model, no notifications, and no event-driven architecture**.

From an engineering perspective, the repository contains several structural forms of technical debt:

- untyped JavaScript;
- strong coupling between business responsibilities and persistence;
- no input validation;
- no database migrations;
- a very weakly constrained SQL schema;
- old frontend dependencies that are not managed through npm;
- tests present in the repository but **not executable through npm scripts**, as Jest is not declared;
- no ESLint configuration, formatter, coverage, or quality gate;
- no CI/CD;
- no Dockerfile or Compose file in the audited repository;
- minimal documentation;
- no explicit Node.js version strategy.

The existing code remains useful as a **functional reference and analysis baseline**, but its current architecture should not be preserved as-is. The rework should target a **modular monolith**: separated React/TypeScript frontend, Express/TypeScript REST API, PostgreSQL through Prisma, RabbitMQ for event-driven communication, automated tests, CI, and containerization.

---

# 2. Audit Scope and Method

The audit covered:

- repository structure;
- npm metadata;
- dependencies and locked versions;
- frontend;
- backend;
- HTTP API;
- SQLite/MySQL persistence;
- data schema;
- existing tests;
- execution scripts;
- Git configuration;
- observable application security;
- maintainability;
- code quality and typing;
- CI/CD and deployment;
- containerization;
- documentation;
- suitability for evolving toward the Kanban requirements.

The audit describes **the state of the provided snapshot**. GitHub settings that are not stored in the repository, such as branch protections, organization permissions, or GitHub secrets, cannot be verified from the archive alone.

---

# 3. Current Repository Structure

```text
getting-started-app/
├── .dockerignore
├── .git/
├── README.md
├── package.json
├── package-lock.json
│
├── spec/
│   ├── persistence/
│   │   └── sqlite.spec.js
│   └── routes/
│       ├── addItem.spec.js
│       ├── deleteItem.spec.js
│       ├── getItems.spec.js
│       └── updateItem.spec.js
│
└── src/
    ├── index.js
    │
    ├── persistence/
    │   ├── index.js
    │   ├── mysql.js
    │   └── sqlite.js
    │
    ├── routes/
    │   ├── addItem.js
    │   ├── deleteItem.js
    │   ├── getItems.js
    │   └── updateItem.js
    │
    └── static/
        ├── index.html
        ├── css/
        │   ├── bootstrap.min.css
        │   ├── styles.css
        │   └── font-awesome/
        └── js/
            ├── app.js
            ├── babel.min.js
            ├── react-bootstrap.js
            ├── react-dom.production.min.js
            └── react.production.min.js
```

### Observations

The structure is short and easy to understand, but it corresponds to a demonstration application rather than a business application designed to evolve.

There is notably no explicit separation between:

- business domain;
- business services;
- HTTP controllers;
- repositories;
- infrastructure;
- configuration;
- validation;
- events.

---

# 4. Technology Inventory and Versions

## 4.1 Backend npm

| Technology | `package.json` declaration | Resolved version | Current role | Assessment |
|---|---:|---:|---|---|
| Node.js | Not declared | Not enforced | Runtime | Non-reproducible version |
| Express | `^5.2.1` | `5.2.1` | HTTP/API/static server | Can be retained |
| mysql2 | `^3.16.1` | `3.16.1` | MySQL access | To be removed with PostgreSQL migration |
| sqlite3 | `^5.1.7` | `5.1.7` | Default persistence | To be removed with PostgreSQL migration |
| uuid | `^13.0.0` | `13.0.0` | Identifier generation | To be reviewed |
| wait-port | `^1.1.0` | `1.1.0` | Wait for MySQL at startup | To be removed/reworked |
| nodemon | `^3.1.9` | `3.1.11` | Development restart | Development tool only |

The lockfile contains **271 package entries**, including transitive dependencies.

### Important Point: Node.js Version

The project contains none of the following:

```text
.nvmrc
.node-version
engines in package.json
```

Express 5.2.1 declares Node.js `>=18`, while some locked dependencies in the dependency graph declare `20 || >=22`. The repository alone therefore does not clearly establish the Node version officially supported by the team.

**Recommended action:** select a supported Node.js LTS version and pin it in the repository, CI, and future Docker images.

### `uuid` Compatibility Point

The backend uses CommonJS:

```js
const { v4: uuid } = require('uuid');
```

while `uuid` 13 belongs to recent versions distributed as ESM. This combination depends on the behavior of the Node runtime in use and creates a portability risk across versions and tooling.

For the rework, two coherent options are available:

- standardize the new backend on ESM/TypeScript;
- or remove this dependency and use `crypto.randomUUID()` when sufficient.

---

## 4.2 Frontend Delivered in `src/static`

| Technology | Identifiable version | Management | Assessment |
|---|---:|---|---|
| React | `16.8.6` | Vendored file | Old |
| ReactDOM | `16.8.6` | Vendored file | Old |
| Babel Standalone | `6.26.0` | Vendored file | Very old / browser runtime |
| Bootstrap | `4.3.1` | Vendored file | Old |
| Font Awesome Free | `5.10.2` | Vendored files | Old |
| React-Bootstrap | Exact version not reliably declared | Vendored file | Not properly traceable |
| Google Fonts / Lato | Version not pinned | External call | Runtime external dependency |

### Frontend Dependency Management Issue

These libraries are not declared in `package.json`. They are copied directly into the repository.

Consequences:

- versions are not centralized;
- updates are manual;
- `npm audit` does not cover these vendored libraries;
- there is no reproducible frontend build mechanism;
- some versions cannot be identified cleanly from the project manifest.

---

# 5. Current Application Architecture

## 5.1 High-Level View

```text
Browser
   │
   ├── GET static files
   │
   ▼
Express / Node.js
   │
   ├── serves src/static/
   │
   └── /items API
          │
          ▼
      Route Handler
          │
          ▼
     Persistence API
          │
      ┌───┴────┐
      ▼        ▼
   SQLite     MySQL
```

The database choice is performed in `src/persistence/index.js`:

```text
MYSQL_HOST present  → MySQL
MYSQL_HOST absent   → SQLite
```

## 5.2 Architectural Style

The project is a **simple monolith with minimal technical separation**.

There is a distinction between `routes` and `persistence`, which is positive, but HTTP routes call the persistence layer directly:

```text
HTTP Route
   ↓
Persistence
   ↓
Database
```

There is therefore no real layer such as:

```text
Controller
   ↓
Service / Use Case
   ↓
Repository
```

### Consequence

As soon as business rules appear — ownership, authorization, Kanban transitions, priorities, deadlines, notifications — they are likely to end up inside HTTP handlers or repositories, making the project harder to test and maintain.

---

# 6. Backend Analysis

## 6.1 Initialization

`src/index.js` directly handles:

- Express application creation;
- JSON middleware;
- static file serving;
- route declaration;
- database initialization;
- port listening;
- system signal handling.

### Positive Points

- code is easy to read;
- database initialization happens before the server starts listening;
- graceful shutdown is planned for `SIGINT`, `SIGTERM`, and `SIGUSR2`;
- recent Express 5 is used.

### Limitations

- port `3000` is hardcoded;
- no configuration validation;
- no structured logger;
- no healthcheck;
- no application error middleware;
- no `app` / `server` separation, which complicates HTTP testing;
- frontend and API are served by the same process.

---

# 7. HTTP API Analysis

## 7.1 Existing Routes

```text
GET    /items
POST   /items
PUT    /items/:id
DELETE /items/:id
```

### Exposed Model

```text
TodoItem
├── id
├── name
└── completed
```

## 7.2 Functionality Actually Available

- Todo creation;
- list of all Todos;
- update of the name and/or `completed` status through the API;
- deletion;
- toggling completed/not completed from the frontend.

The frontend does not actually expose a complete name-editing interface despite the `PUT` endpoint supporting it.

## 7.3 REST Compliance

The API uses the basic HTTP methods correctly, but several conventions should be improved:

- no `/api` prefix;
- no API versioning;
- `POST /items` implicitly returns `200` instead of `201 Created`;
- `DELETE` always returns `200`, even if the item does not exist;
- `PUT` does not enforce resource existence before/after modification as a business rule;
- no uniform error format;
- no pagination;
- no filtering;
- no sorting;
- no health endpoint.

---

# 8. Validation and Error Handling

## 8.1 Validation

No schema validation is present.

Example:

```js
name: req.body.name
```

The value is passed directly to persistence.

There is no explicit validation of:

- presence of `name`;
- type of `name`;
- length;
- empty or whitespace-only strings;
- type of `completed`;
- ID format;
- unknown fields.

## 8.2 Error Handling

The `async` handlers do not define a business error policy or error mapping.

Express 5 can forward rejected Promises to the Express error mechanism, but the project has no custom middleware producing a stable error format.

Consequences:

- non-contractual error responses;
- no business distinction between `404`, `409`, `422`, etc.;
- risk of exposing technical details depending on environment;
- frontend cannot handle errors cleanly.

---

# 9. Persistence and Data Model

## 9.1 Available Engines

The project contains two almost duplicated implementations:

```text
SQLite
MySQL
```

The common interface exposes:

```text
init()
teardown()
getItems()
getItem(id)
storeItem(item)
updateItem(id, item)
removeItem(id)
```

### Positive Point

A minimal persistence abstraction already exists, showing an intent not to expose SQL directly to routes.

### Limitation

Both implementations duplicate most of their logic and use callbacks manually wrapped in Promises.

---

## 9.2 SQL Schema

Current schema:

```sql
CREATE TABLE IF NOT EXISTS todo_items (
    id varchar(36),
    name varchar(255),
    completed boolean
)
```

### Structural Problems

No explicit constraints:

- no `PRIMARY KEY`;
- no `NOT NULL`;
- ID uniqueness not guaranteed;
- no index;
- no timestamps;
- no relationships;
- no foreign keys;
- no user/project concept.

The schema is created at startup using `CREATE TABLE IF NOT EXISTS`, not through a migration system.

### Consequences

- difficult schema evolution;
- changes are not versioned;
- risk of environment divergence;
- no schema rollback strategy;
- business constraints are not enforced by the database.

---

## 9.3 SQLite

Default configuration:

```text
SQLITE_DB_LOCATION || /etc/todos/todo.db
```

### Limitations

- Unix path hardcoded as default;
- local filesystem dependency;
- limited portability;
- incompatible with a horizontal-scaling strategy using multiple instances that share the same data;
- unsuitable for the collaborative target of the project.

---

## 9.4 MySQL

Configuration can be loaded from:

```text
MYSQL_HOST
MYSQL_USER
MYSQL_PASSWORD
MYSQL_DB
```

or their `*_FILE` variants.

### Positive Points

- parameterized queries, reducing the risk of classic SQL injection;
- connection pool;
- support for secret values provided through files;
- `utf8mb4` charset.

### Points to Fix

- no configuration validation;
- `*_FILE` values are read without explicit encoding/trim;
- MySQL port waiting is embedded in the application;
- no migration strategy;
- no business transactions;
- no connection observability.

---

# 10. Frontend Analysis

## 10.1 Architecture

The frontend is mainly contained in a single file:

```text
src/static/js/app.js
```

Components:

```text
App
TodoListCard
AddItemForm
ItemDisplay
```

State is managed with:

```text
React.useState
React.useEffect
React.useCallback
```

## 10.2 Loading

`index.html` globally loads:

```text
React
ReactDOM
React-Bootstrap
Babel Standalone
app.js as text/babel
```

JSX is therefore transformed **in the browser at runtime**.

### Impacts

- no real production build;
- no tree shaking;
- no bundling;
- frontend dependencies not managed by npm;
- unnecessarily increased load time;
- harder CSP strategy with runtime Babel;
- no TypeScript checking;
- architecture not suitable for a growing number of screens.

Static files represent several megabytes in the repository, mainly because of vendored libraries and Font Awesome fonts.

## 10.3 HTTP Call Management

The frontend directly uses `fetch()`.

There is no centralized API client layer.

Calls do not systematically check:

```js
response.ok
```

### Example Consequence

A `DELETE` returning an HTTP error status may still trigger local removal of the item because `fetch()` resolves the Promise for HTTP 4xx/5xx responses.

## 10.4 UI States

Present:

- minimal initial loading;
- state during creation;
- empty state.

Absent:

- error handling;
- retry;
- global feedback;
- routing;
- authentication;
- session management;
- project state;
- Kanban;
- notifications.

---

# 11. Security

## 11.1 Authentication

**Absent.**

All routes are accessible without a user identity.

## 11.2 Authorization

**Absent.**

There is no ownership or permission concept.

## 11.3 Validation

**Absent.**

User data is sent directly to the persistence layer.

## 11.4 SQL Injection

Positive point: dynamic SQL queries use `?` placeholders, which significantly reduces the risk of classic SQL injection for the relevant parameters.

## 11.5 HTTP Security Headers

No tool such as `helmet` is configured.

There is no explicit strategy for:

- CSP;
- HSTS;
- frame protection;
- MIME sniffing protection;
- referrer policy.

## 11.6 Rate Limiting

Absent.

## 11.7 Secrets

MySQL secrets can be provided through variables or files, which is a good starting point.

However:

- no `.env.example`;
- no centralized validation;
- no secret documentation;
- the archive does not allow GitHub secrets to be audited.

## 11.8 Google Fonts Dependency

The browser contacts `fonts.googleapis.com` for Lato.

For an application expected to address GDPR compliance, this external dependency should be assessed. Self-hosting fonts is preferable if the goal is to reduce external dependencies and external data transfers.

---

# 12. Tests

## 12.1 Existing Tests

The repository contains **9 tests**, distributed as follows:

| Area | Count |
|---|---:|
| SQLite persistence | 5 |
| `addItem` route | 1 |
| `deleteItem` route | 1 |
| `getItems` route | 1 |
| `updateItem` route | 1 |

The tests use the Jest API:

```text
test()
expect()
jest.mock()
jest.fn()
```

## 12.2 Blocking Issue

`package.json` contains:

- no `jest` dependency;
- no `test` script.

Running:

```bash
npm test
```

therefore fails immediately with:

```text
Missing script: "test"
```

The test files are present, but **the testing strategy is no longer operational in the current state of the repository**.

## 12.3 Insufficient Functional Coverage

Absent:

- MySQL tests;
- HTTP tests through a real Express server;
- frontend tests;
- integration tests;
- E2E tests;
- security tests;
- validation tests;
- error-case tests;
- concurrency tests;
- event tests;
- coverage measurement.

## 12.4 SQLite Test Robustness

The tests initialize the database multiple times but do not consistently call `teardown()` after each test.

This can leave open handles and makes the suite less portable, particularly on systems where an open file cannot be cleanly deleted.

---

# 13. Typing and Code Quality

## 13.1 Typing

The project is entirely written in JavaScript.

Absent:

```text
TypeScript
tsconfig.json
typed DTOs
shared types
```

No compile-time check prevents, for example:

```text
completed = "hello"
name = undefined
```

before execution.

## 13.2 Lint / Formatter

Absent:

```text
ESLint
Prettier
EditorConfig
lint script
format script
```

## 13.3 Quality Analysis

Absent:

```text
SonarQube / SonarCloud
quality gate
coverage gate
static analysis in CI
```

## 13.4 Complexity

The code is currently low in complexity only because the functional scope is extremely small.

This simplicity does not guarantee maintainability at the scale required by the specification: the current architecture does not provide the boundaries needed before adding authentication, projects, tasks, notifications, and events.

---

# 14. npm Configuration and Reproducibility

## 14.1 Existing Scripts

Only one script:

```json
"dev": "nodemon -L src/index.js"
```

Absent:

```text
start
test
lint
lint:fix
format
format:check
typecheck
build
coverage
```

## 14.2 Metadata

```text
name: 101-app
version: 1.0.0
license: MIT
main: index.js
```

### Points to Fix

- `101-app` does not express the project domain;
- `main: index.js` does not match the actual `src/index.js` entrypoint;
- no `private: true`, so the package is not explicitly protected against accidental npm publication;
- no Node version declared;
- MIT license is declared in `package.json`, but no `LICENSE` file is present in the snapshot.

---

# 15. Git and Repository Governance

The Git repository embedded in the archive still points to:

```text
git@github.com:docker/getting-started-app.git
```

Latest commit in the snapshot:

```text
6b025fc — update app to remove vulns (#98)
Date: 2026-01-28
```

The history includes several dependency updates related to vulnerabilities.

### Important Note

The repository contains no `.gitignore`.

This is a concrete risk: directories such as `node_modules` or `.env` files may be committed accidentally if the team does not ignore them through another mechanism.

### What Cannot Be Audited from the Archive

- GitHub branch protections;
- approval rules;
- organization permissions;
- GitHub Project;
- GitHub secrets;
- merge rules configured on the platform.

---

# 16. Docker, Deployment, and CI/CD

## 16.1 Docker

The provided project **does not contain a Dockerfile**.

It also does not contain:

```text
compose.yaml
docker-compose.yml
```

Only this file exists:

```text
.dockerignore
```

with:

```text
node_modules
Dockerfile
```

This file is therefore currently a remnant of the project's Docker origin, but **does not represent containerization**.

## 16.2 CI

No directory exists at:

```text
.github/workflows/
```

There is therefore no automated pipeline versioned in the snapshot.

## 16.3 CD

Absent.

## 16.4 Image Publication

Absent.

## 16.5 Healthcheck / Readiness

Absent.

---

# 17. Observability

Observability is almost nonexistent.

Present:

```text
console.log()
console.error()
```

Absent:

- structured logger;
- log levels;
- correlation/request ID;
- metrics;
- tracing;
- health endpoint;
- readiness endpoint;
- audit logs;
- monitoring.

For the three-week project scope, advanced metrics/tracing are not a priority, but structured logging and healthchecks are recommended.

---

# 18. Documentation

The `README.md` only contains a few lines indicating that the application is a demonstration app from the Docker guide.

Absent:

- detailed installation instructions;
- Node version;
- environment variables;
- architecture;
- conventions;
- API documentation;
- tests;
- Git workflow;
- database strategy;
- deployment instructions;
- troubleshooting.

The current documentation does not allow a new developer to properly install and understand the project without reading the code directly.

---

# 19. Architecture Assessment Against the Requested Evolution

## 19.1 What Can Be Retained Conceptually

- Node.js as backend runtime;
- Express as HTTP framework;
- the principle of a separate data-access layer;
- parameterized queries;
- graceful shutdown;
- UUID as an identifier strategy if standardized;
- the principle of small and readable handlers/files.

## 19.2 What Must Be Replaced or Restructured

- static React 16 frontend;
- runtime Babel;
- vendored frontend dependencies;
- untyped backend JavaScript;
- routes directly coupled to the database;
- SQLite/MySQL duality;
- runtime schema creation;
- current error management;
- current configuration strategy;
- broken test setup;
- lack of CI/quality processes;
- minimal documentation.

---

# 20. Gap Against Kanban Project Requirements

| Target requirement | Legacy state |
|---|---|
| Functional interface | Partial — minimal TodoList |
| Secure authentication | Absent |
| GDPR-compatible user management | Absent |
| Project CRUD | Absent |
| Business task CRUD | Very partial — Todo items only |
| Kanban workflow | Absent — `completed` boolean only |
| Priorities | Absent |
| Deadlines | Absent |
| Notifications | Absent |
| Personalized home | Absent |
| Event-driven | Absent |
| CI | Absent |
| Docker image publication | Absent |
| Quality gate | Absent |
| Operational tests | No — test sources exist but runner is not configured |
| Coverage | Absent |
| Architecture documentation | Absent |

The legacy codebase is therefore clearly a **starting point to analyze and rework**, not an architectural foundation to extend without significant change.

---

# 21. Priority Technical Risks

## High Priority

### R1 — Architecture Too Coupled for the New Domain

HTTP handlers directly call persistence. Adding business rules would rapidly increase coupling.

**Action:** introduce modules, services/use cases, and repositories from Sprint 1.

### R2 — Tests Exist but Are Not Operational

Jest is neither declared nor scripted.

**Action:** rebuild the testing strategy immediately and integrate it into CI.

### R3 — Data Without Constraints or Migrations

The current schema provides almost no integrity guarantees.

**Action:** PostgreSQL + Prisma + versioned migrations.

### R4 — No Validation or Error Policy

HTTP inputs are not validated.

**Action:** schema validation at the HTTP boundary and a standardized error format.

### R5 — Frontend Technically Obsolete and Non-Reproducible

Dependencies are vendored and Babel compiles JSX in the browser.

**Action:** modern React + TypeScript + Vite, managed through npm dependencies.

### R6 — No Quality Automation

No linting, scripted tests, coverage, CI, or quality gate.

**Action:** ESLint, TypeScript, tests, coverage, static analysis, GitHub Actions.

### R7 — No Contractual Node Version

Developers and CI may use different runtimes.

**Action:** pin an LTS version and use it everywhere.

---

## Medium Priority

### R8 — Configuration Is Not Centralized

Port and SQLite path are hardcoded, and environment variables are not validated.

### R9 — No Structured Logging

Production diagnosis would be difficult.

### R10 — Missing `.gitignore`

Risk of accidentally committing dependencies or local secrets.

### R11 — Insufficient Documentation

Onboarding and maintenance are difficult.

### R12 — Frontend Dependencies Invisible to npm

Updates and security tracking are incomplete.

---

# 22. Recommended Target Architecture

The project does not require microservices to satisfy the specification.

The recommended target is a **modular monolith with an event-driven mechanism**.

```text
                         ┌──────────────────┐
                         │  React + TS/Vite │
                         │     Frontend     │
                         └────────┬─────────┘
                                  │ REST / JSON
                                  ▼
┌──────────────────────────────────────────────────────────┐
│                Express + TypeScript API                  │
│                                                          │
│  Auth/Users   Projects   Tasks   Notifications           │
│      │           │         │           │                 │
│      └───────────┴─────────┴───────────┘                 │
│                      Services                            │
│                         │                                │
│                    Repositories                          │
└──────────────┬──────────────────────────────┬────────────┘
               │                              │
               ▼                              ▼
          Prisma ORM                       RabbitMQ
               │                              │
               ▼                              ▼
          PostgreSQL                      Consumers
```

## Recommended Technologies for the Rework

| Area | Target |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + TypeScript + Express 5 |
| Validation | Zod or equivalent |
| API | REST |
| ORM | Prisma |
| Database | PostgreSQL |
| Event-driven | RabbitMQ |
| Auth | Secure mechanism defined by the team, with shared/persistent storage where needed |
| Lint | ESLint |
| Formatting | Prettier if adopted |
| Unit tests | Vitest |
| API integration | Supertest |
| Frontend tests | React Testing Library |
| E2E | Playwright or equivalent if adopted |
| Code quality | SonarQube/SonarCloud or equivalent |
| CI | GitHub Actions |
| Containers | Docker + Docker Compose |
| API docs | OpenAPI |

---

# 23. Target Backend Structure

```text
apps/api/src/
├── config/
├── middleware/
├── events/
├── infrastructure/
│   ├── database/
│   └── messaging/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── projects/
│   ├── tasks/
│   └── notifications/
└── server.ts
```

For each business module:

```text
Controller
   ↓
Service / Use Case
   ↓
Repository
   ↓
Prisma
   ↓
PostgreSQL
```

This structure remains simple, testable, and compatible with the actual scale of the project.

---

# 24. Recommended Migration Strategy

## Phase 1 — Stabilize the Foundations

1. preserve the legacy snapshot;
2. document the audit and technical debt;
3. define the Node version;
4. define Git, coding, testing, and naming conventions;
5. configure ESLint/TypeScript;
6. establish CI;
7. create the React/TypeScript/Vite frontend;
8. restructure the backend in TypeScript;
9. configure PostgreSQL + Prisma;
10. create Docker/Compose;
11. configure tests and coverage.

## Phase 2 — Core Domain

1. Users/Auth;
2. Projects;
3. Tasks;
4. ownership;
5. Kanban workflow;
6. frontend connected to the API.

## Phase 3 — Event-Driven and Quality

1. RabbitMQ;
2. `task.created`;
3. notification consumer;
4. complete demonstrable workflow;
5. blocking quality gate;
6. integration/E2E tests;
7. security hardening;
8. final documentation.

---

# 25. Conclusion

The Legacy project is **appropriate for its original role as a TodoList demonstrator**, but its architecture and tooling are not suitable for the requirements of a maintainable, production-ready Kanban application.

The main challenge is not simply to patch each current file one by one. It is to **preserve useful behavior while replacing the technical foundations that prevent the application from evolving safely**.

The most structural issues are:

1. no real business layer;
2. old vendored frontend without a build process;
3. no typing or validation;
4. data model without constraints or migrations;
5. testing strategy currently not executable;
6. complete absence of CI/quality gate;
7. no current containerization despite the presence of `.dockerignore`;
8. no authentication, application security, or event-driven mechanism;
9. insufficient documentation;
10. no pinned Node runtime.

The recommended trajectory — **TypeScript modular monolith + REST + Prisma/PostgreSQL + RabbitMQ + CI/quality + Docker** — directly addresses these weaknesses without introducing the unnecessary complexity of microservices or premature horizontal scaling.

---

## Appendix A — Verified Quick Findings

```text
HTTP routes                     4
Tests present                   9
npm test script                 absent
Jest in package.json            absent
TypeScript                      absent
ESLint                          absent
Prettier                        absent
Coverage                        absent
GitHub Actions CI               absent
Dockerfile                      absent
Docker Compose                  absent
.dockerignore                   present
.gitignore                      absent
Authentication                  absent
Authorization                   absent
Event-driven                    absent
RabbitMQ                        absent
Prisma                          absent
PostgreSQL                      absent
SQLite                          present
MySQL                           present
Complete business REST API      absent
OpenAPI                         absent
Healthcheck                     absent
Structured logging              absent
```

## Appendix B — Detected Versions

```text
Application package             1.0.0
Express                         5.2.1
mysql2                          3.16.1
sqlite3                         5.1.7
uuid                            13.0.0
wait-port                       1.1.0
nodemon                         3.1.11 (lockfile)
React                           16.8.6
ReactDOM                        16.8.6
Babel Standalone                6.26.0
Bootstrap                       4.3.1
Font Awesome Free               5.10.2
React-Bootstrap                 version not reliably declared
Node.js                         not pinned in repository
```
