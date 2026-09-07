# Backend Legacy Migration to the Target Architecture

## 1. Objective

The backend migration must progressively modernize the existing application without replacing it with an independent new codebase.

The selected approach is an **incremental legacy migration**, comparable to the modernization of an enterprise application already in production:

```text
Legacy Backend
Node.js + Express + JavaScript
Direct SQLite / MySQL persistence
        ↓
Stabilization and tests
        ↓
Progressive TypeScript migration
        ↓
Controller / Service / Repository separation
        ↓
Introduction of Prisma
        ↓
Database modernization to PostgreSQL
        ↓
Domain evolution from Todo → Project / Task
        ↓
Authentication and user management
        ↓
Event-driven communication with RabbitMQ
```

The application must remain functional throughout the major migration steps.

---

## 2. Audit Finding

The current legacy data model is extremely limited.

The main table is structured around only three pieces of information:

```text
todo_items
├── id
├── name
└── completed
```

There is no concept of user, owner, or account association in the current model.

Therefore, there is no reliable link allowing the system to determine:

```text
Existing Todo
      ↓
Who owns it?
```

This limitation is important because the target architecture introduces authenticated and isolated data ownership:

```text
User
 └── Projects
      └── Tasks
```

A task must therefore always be associated with a user or with a project the user is authorized to access.

This point is considered a **functional and data-governance limitation identified during the legacy audit**.

---

## 3. Decision Regarding Legacy Data

### 3.1 Existing Tickets Will Not Be Automatically Migrated

The selected decision is to **not automatically import existing `todo_items` records into the new Kanban model**.

This does not mean the target database schema will not be created or migrated technically.

The target schema will be created and versioned, notably through Prisma.

The decision only concerns **legacy business data whose ownership cannot be determined**.

```text
Legacy Database
todo_items
   │
   │ no automatic business-data migration
   ✕
   │
   ▼
Target Structure
Users → Projects → Tasks
```

### 3.2 Database Engine Modernization

Because the target data model is being rebuilt and the legacy business records cannot be safely reassigned to future users, the team has also decided to migrate the database engine to **PostgreSQL**.

The legacy application currently supports SQLite / MySQL. These technologies remain part of the audited starting point, but they are not retained as the target persistence engine.

The transition is therefore:

```text
Legacy
SQLite / MySQL
     ↓
Repository abstraction
     ↓
Prisma
     ↓
PostgreSQL
```

This decision is considered a controlled modernization of the persistence technology for the following reasons:

- the target application requires a new schema for users, projects, tasks, permissions, and notifications;
- existing tickets are not imported into the new authenticated model;
- there is therefore no requirement to preserve the legacy database engine for historical data compatibility;
- changing the engine while the data layer is already being rebuilt avoids another infrastructure migration later;
- Prisma keeps the rest of the backend isolated from PostgreSQL-specific persistence details.

The database-engine change must remain independent from business logic: controllers and services must not depend directly on PostgreSQL.

---

## 4. Rationale

Automatically migrating historical tickets would require choosing an owner or visibility level arbitrarily.

However, the legacy system contains no information that can establish ownership.

Three scenarios were considered.

### Scenario A — Arbitrarily Assign Tickets

```text
Legacy Todo
     ↓
Arbitrarily selected user
```

This option is rejected because it would introduce incorrect and unverifiable ownership information.

### Scenario B — Make All Legacy Tickets Visible to All Users

```text
Legacy Todos
     ↓
Visible to every new account
```

This option is also rejected.

The new system introduces authentication and separation of user data. Publishing legacy tickets to all accounts would contradict the authorization model and create an unnecessary risk of information disclosure.

### Scenario C — Do Not Migrate Tickets with Unknown Ownership

This is the selected option.

It allows the new system to start with a coherent ownership model:

```text
Authenticated User
        ↓
Authorized Project
        ↓
Project Tasks
```

No historical data is assigned or exposed without a reliable basis.

---

## 5. GDPR and Privacy Considerations

The decision is also motivated by a principle of **data-risk minimization**.

The main issue is not to claim that GDPR technically forbids any migration of these records.

The issue is that the legacy system provides no information allowing the team to determine:

- who owns a ticket;
- who is authorized to view it;
- whether its content may be exposed to a new user;
- how future access, export, or deletion rules should apply to it.

A global migration into a shared space would therefore force the application to expose historical content to users whose rights over that content cannot be demonstrated.

The selected decision avoids this situation by design.

The new model guarantees that a task is created **after authentication**, within a known user and project context.

---

## 6. Communication Before the Upgrade

The absence of automatic historical-ticket migration must be anticipated and communicated to users.

Before deploying the new version, an information period should be planned.

Users will be informed that:

- the application will evolve from a TodoList into a Kanban application with user accounts;
- existing tasks cannot be automatically associated with an account;
- legacy data will therefore not be imported into individual user workspaces;
- users should keep or record any information they still need before the migration;
- after creating their account, they will be able to recreate any tasks that remain relevant inside their new projects.

The target transition process is therefore:

```text
Upgrade announcement
        ↓
User preparation period
        ↓
Deployment of the new system
        ↓
Account creation
        ↓
Authentication
        ↓
Project creation
        ↓
Recreation of still-relevant tasks
```

This approach is preferable to an automatic migration based on artificial ownership rules.

---

## 7. Accepted Functional Consequence

This decision intentionally introduces a **break in historical data continuity**.

It is accepted because:

1. the legacy model cannot identify ticket owners;
2. the new application introduces real user management;
3. the new security rules must apply from the moment new data is created;
4. users will receive advance notice and time to prepare;
5. the technical migration remains incremental even though legacy business records are not reused.

This decision must remain documented in the audit and architecture documentation so that it stays traceable and justifiable.

---

## 8. Target Backend Architecture

The target architecture remains a **modular monolith**.

```text
React Frontend
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
      ├───────────────┐
      ▼               ▼
Repositories        Events
      │               │
      ▼               ▼
Prisma            RabbitMQ
      │
      ▼
PostgreSQL
```

Responsibilities are separated as follows.

### Controllers

Responsible for the HTTP layer:

- reading route parameters;
- retrieving validated input;
- calling services;
- building HTTP responses.

### Services

Responsible for business logic:

- authentication;
- authorization;
- project rules;
- task rules;
- Kanban transitions;
- domain-event publication.

### Repositories

Responsible for data access.

They isolate business logic from Prisma and the database.

### Prisma

Prisma is progressively introduced as the ORM used by repositories to access PostgreSQL.

### RabbitMQ

RabbitMQ is used for asynchronous processing and the event-driven workflow required by the project.

---

## 9. Technical Backend Migration

### Step 1 — Establish the Baseline

Before any refactor:

- document existing endpoints;
- document the current data model;
- identify current functional behavior;
- keep or add characterization tests;
- verify that legacy behavior is reproducible.

### Step 2 — Introduce Safety Nets

Progressively add:

```text
ESLint
TypeScript
Tests
Coverage
Code-quality analysis
CI
```

The objective is to secure later changes.

### Step 3 — Introduce TypeScript

JavaScript and TypeScript may temporarily coexist.

New code is developed in TypeScript, while legacy parts are migrated when they are modified.

The whole codebase is not converted in a single operation.

### Step 4 — Create Architectural Boundaries

Progressively move from:

```text
Route
 ↓
Persistence
```

to:

```text
Route
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Persistence
```

This step should happen before major persistence changes in order to reduce coupling.

### Step 5 — Introduce Prisma and PostgreSQL

Prisma is introduced behind repositories and becomes the migration boundary between the legacy persistence implementation and the new PostgreSQL database.

```text
Legacy persistence
SQLite / MySQL
        ↓
Repository
        ↓
Prisma
        ↓
PostgreSQL
```

The target PostgreSQL schema is created from the new domain requirements rather than by copying the legacy `todo_items` structure.

The rest of the application must not depend directly on Prisma or PostgreSQL.

### Step 6 — Introduce the User Model

Create the:

```text
User
```

model including:

- identifier;
- account information;
- securely managed credentials;
- creation and update timestamps.

From this stage onward, new business data can be associated with an authenticated user.

### Step 7 — Introduce Projects and Tasks

The legacy model:

```text
Todo
├── id
├── name
└── completed
```

is functionally replaced by:

```text
Project
└── Tasks
    ├── id
    ├── title
    ├── description
    ├── status
    ├── priority
    ├── deadline
    ├── projectId
    ├── createdAt
    └── updatedAt
```

Existing `todo_items` are not automatically imported into this model.

### Step 8 — Introduce Authorization

Every access must be controlled on the backend.

Example:

```text
User A
    ↓
Project A
    ↓
Tasks A
```

User A must not be able to read or modify private resources belonging to User B.

### Step 9 — Introduce Event-Driven Communication

Once the Task domain is stable:

```text
TaskService
    │
    ├── persist task
    │
    └── publish task.created
                     ↓
                  RabbitMQ
                     ↓
             Notification Consumer
```

### Step 10 — Remove Obsolete Legacy Code

A legacy section should only be removed when:

- its replacement is functional;
- tests pass;
- CI is successful;
- the new persistence layer works;
- no active feature still depends on that code.

---

## 10. Target Data Strategy

The new database must have explicit data ownership.

Simplified example:

```text
User
 └── Project
      └── Task
```

A task must not exist without a defined business context.

From creation time onward, new data therefore has:

- an identifiable owner or authorization context;
- explicit relationships;
- verifiable access rules;
- a lifecycle compatible with future account export and deletion capabilities.

---

## 11. Expected Result

At the end of the migration, the backend should be:

- mostly or fully written in TypeScript;
- organized into business modules;
- exposed through a REST API;
- separated into Controllers, Services, and Repositories;
- connected to PostgreSQL through Prisma;
- secured through authentication and authorization;
- testable;
- covered by CI and code-quality checks;
- able to publish and consume RabbitMQ events;
- progressively cleaned of legacy persistence access.

The migration must demonstrate a **controlled modernization of an existing system**, without hiding legacy limitations or inventing ownership information that does not exist.

---

## 12. Architecture Decision to Retain

> **Historical `todo_items` data will not be automatically migrated into the new Kanban model because the legacy system contains no information that can reliably determine ownership. Assigning those records arbitrarily or exposing them to every new user would be incompatible with the authentication, authorization, and privacy model introduced by the upgraded application. Users will be informed in advance of the upgrade so they can preserve any information they still need and recreate relevant tasks after creating and authenticating their account.**

This decision is a direct consequence of the legacy data-model audit and must remain documented throughout the migration.
