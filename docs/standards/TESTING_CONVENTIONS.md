# Testing Conventions

## 1. Purpose

This document defines testing conventions for the incremental migration from the legacy TodoList to the target Kanban application.

Tests are used both to protect existing behavior during refactoring and to validate new functionality.

---

## 2. General Principles

- Tests must be deterministic and reproducible.
- Tests must not depend on execution order.
- Tests must never use production credentials or the production database.
- New business rules require appropriate automated tests.
- Tests should verify observable behavior rather than private implementation details.
- Relevant tests must not be removed only to make CI pass.

---

## 3. Legacy Characterization Tests

Before refactoring a legacy behavior, first protect the behavior that must remain valid.

Typical legacy behaviors include:

```text
Create Todo
List Todos
Update Todo
Delete Todo
```

Characterization tests are not an endorsement of the legacy design. They establish a baseline that detects accidental regressions during migration.

Target process:

```text
Legacy behavior
      ↓
Characterization test
      ↓
Refactor / migration
      ↓
Test remains green
```

Obsolete behavior may be removed only when the corresponding product decision is explicit.

---

## 4. Test Levels

### Unit Tests

Use unit tests for isolated business logic:

- services;
- validation logic;
- authorization rules;
- Kanban transitions;
- event payload creation;
- pure functions.

Examples:

```text
task.service.test.ts
auth.service.test.ts
```

Unit tests should not use real PostgreSQL, RabbitMQ, network, or filesystem access.

### Integration Tests

Use integration tests for technical boundaries:

- REST route + controller + service + repository;
- Prisma + PostgreSQL;
- authentication middleware + protected endpoint;
- RabbitMQ publisher + consumer;
- persistence after event consumption.

Examples:

```text
projects.integration.test.ts
tasks.integration.test.ts
events.integration.test.ts
```

### End-to-End Tests

Use E2E tests for critical user workflows.

Target critical workflow:

```text
Register
→ Login
→ Create Project
→ Create Task
→ Move Task
→ Update Task
→ Delete Task
```

Keep E2E tests focused because they are slower and more expensive to maintain.

---

## 5. Frontend Testing

Frontend tests focus on user-visible behavior:

- rendering;
- user interaction;
- loading states;
- errors;
- validation feedback;
- navigation;
- API-driven state changes.

Recommended tools:

```text
Vitest
React Testing Library
```

Prefer accessible selectors such as roles, labels, and visible text.

---

## 6. Backend Testing

Backend tests focus on business rules and HTTP behavior.

Service unit tests should remain independent from Express where practical.

API integration tests should verify:

- method and route;
- authentication;
- authorization;
- validation;
- status code;
- response body;
- persistence side effects.

Recommended tools:

```text
Vitest
Supertest
```

---

## 7. Prisma and PostgreSQL Testing

Database integration tests use a dedicated PostgreSQL test database.

Rules:

- never use development or production data;
- isolate test data;
- clean/reset data between tests;
- apply target migrations before integration tests;
- verify important constraints and relationships.

Recommended variable:

```text
DATABASE_URL_TEST
```

When containerized integration tests are available, the PostgreSQL test instance should be disposable.

During the migration period, legacy persistence tests may coexist with Prisma integration tests until the relevant repository has fully migrated.

---

## 8. RabbitMQ and Event Testing

### Unit Level

Verify that:

- the expected event is produced;
- the payload is valid;
- the consumer applies the expected business action.

### Integration Level

Verify the complete workflow:

```text
Producer
→ RabbitMQ
→ Queue
→ Consumer
→ Side effect
```

Mandatory demonstrable workflow:

```text
Task created
→ task.created
→ RabbitMQ
→ Notification consumer
→ Notification persisted
```

When implemented, also test:

- duplicates;
- idempotency;
- retries;
- consumer failures;
- malformed payloads.

---

## 9. Test Naming

```text
<target>.test.ts
<target>.integration.test.ts
<workflow>.e2e.test.ts
```

Examples:

```text
task.service.test.ts
projects.integration.test.ts
kanban-workflow.e2e.test.ts
```

Prefer:

```ts
it("rejects login when the password is invalid", ...)
it("prevents a user from updating another user's project", ...)
it("publishes task.created after the task is persisted", ...)
```

Avoid vague descriptions such as `works`, `test login`, or `case 1`.

---

## 10. Test Structure

Use Arrange / Act / Assert when it improves readability.

```ts
it("creates a project for the authenticated user", async () => {
  const input = { name: "Project Alpha" };

  const result = await projectService.create(userId, input);

  expect(result.name).toBe("Project Alpha");
  expect(result.ownerId).toBe(userId);
});
```

---

## 11. Mocks

Mocks are appropriate for unit-level isolation, for example:

- repository dependency in a service unit test;
- simulated infrastructure failure;
- RabbitMQ publisher in a business-service unit test.

Do not mock the component the test is intended to validate.

Integration tests should use real boundaries where practical.

---

## 12. Negative and Edge Cases

Relevant negative cases must be tested, including:

- invalid credentials;
- duplicate email;
- missing resource;
- forbidden resource access;
- invalid task status;
- invalid deadline;
- duplicate event;
- database constraint violations;
- broker unavailability where recovery is expected.

Business-critical functionality must not be tested only on the happy path.

---

## 13. Coverage

Initial target:

```text
>= 70% overall coverage
```

Coverage must be generated in CI.

During migration, coverage should be interpreted together with the amount of legacy code not yet migrated. New and modified business logic must receive meaningful coverage even when legacy code still lowers the global value.

---

## 14. CI Requirements

At minimum, every Pull Request runs:

```text
lint
typecheck
unit tests
coverage
build
```

Integration and E2E tests are added to CI as soon as their infrastructure is operational.

A failing required test blocks the Pull Request.

---

## 15. Definition of Done

An issue cannot be considered Done when:

- required tests are missing;
- required tests fail;
- required coverage is not met;
- relevant integration behavior has not been validated.

A feature that only works locally is not Done.
