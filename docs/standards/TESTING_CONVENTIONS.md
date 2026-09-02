# Testing Conventions

## 1. Purpose

This document defines the testing conventions used by the Kanban rework project.

The objective is to keep tests consistent, deterministic, maintainable, and useful throughout all three sprints.

These conventions apply to frontend, backend, API, database, and event-driven code.

---

## 2. General Principles

- Every new business rule must be covered by appropriate automated tests.
- Tests must verify observable behaviour, not internal implementation details.
- Tests must be deterministic and reproducible.
- Tests must not depend on execution order.
- Tests must not rely on real production data.
- Tests must not call external production services.
- A failing test must clearly identify the behaviour that is broken.
- A Pull Request must not remove relevant tests only to make the CI pass.

---

## 3. Test Levels

The project uses three main test levels.

### 3.1 Unit Tests

Unit tests verify isolated business logic.

Typical targets:

- services;
- pure functions;
- validation logic;
- authorization rules;
- status transition rules;
- domain utilities.

Examples:

```text
auth.service.test.ts
task.service.test.ts
project.service.test.ts
```

Unit tests should avoid real database, network, RabbitMQ, or filesystem access.

Dependencies should be replaced with test doubles only when isolation is useful.

---

### 3.2 Integration Tests

Integration tests verify that several technical components work together.

Typical targets:

- REST route + controller + service + repository;
- Prisma + PostgreSQL;
- authentication middleware + protected endpoint;
- RabbitMQ publisher + consumer;
- persistence after event consumption.

Examples:

```text
projects.integration.test.ts
tasks.integration.test.ts
auth.integration.test.ts
events.integration.test.ts
```

Integration tests may use real test containers or dedicated test services when practical.

They must never use the production database.

---

### 3.3 End-to-End Tests

End-to-end tests validate critical user workflows through the application.

Minimum critical workflow:

```text
Register
→ Login
→ Create Project
→ Create Task
→ Move Task
→ Update Task
→ Delete Task
```

E2E tests should remain limited to important workflows because they are slower and more expensive to maintain.

Examples:

```text
authentication.e2e.test.ts
kanban-workflow.e2e.test.ts
```

---

## 4. Frontend Testing

Frontend tests should focus on user-visible behaviour.

Test:

- rendering;
- user interactions;
- loading states;
- error states;
- validation feedback;
- navigation behaviour;
- API-driven state changes.

Prefer queries based on accessible roles, labels, and visible text.

Avoid tests that depend on private component implementation details.

Recommended tools:

```text
Vitest
React Testing Library
```

---

## 5. Backend Testing

Backend tests should focus on business rules and HTTP behaviour.

Services should be unit-tested independently from Express when practical.

API integration tests should verify:

- HTTP method;
- route;
- authentication;
- authorization;
- validation;
- response status;
- response body;
- persistence side effects.

Recommended tools:

```text
Vitest
Supertest
```

---

## 6. Prisma and Database Testing

Database integration tests must use a dedicated test database.

Rules:

- never use the development or production database for automated tests;
- isolate test data;
- reset or clean data between tests;
- apply migrations before integration tests;
- verify relevant database constraints and relationships.

Recommended environment variable:

```text
DATABASE_URL_TEST
```

If the project uses containerized integration tests, the PostgreSQL test instance must be disposable.

---

## 7. RabbitMQ and Event-Driven Testing

Event-driven workflows must be tested at two levels.

### Unit level

Verify that:

- the correct event is produced;
- the event payload contains the expected data;
- the consumer applies the expected business action.

### Integration level

Verify the complete workflow:

```text
Producer
→ RabbitMQ
→ Queue
→ Consumer
→ Side effect
```

For the mandatory demonstrable workflow:

```text
Task created
→ task.created
→ RabbitMQ
→ Notification consumer
→ Notification persisted
```

Tests must also cover, when implemented:

- duplicate event handling;
- idempotency;
- retry behaviour;
- consumer failure;
- malformed event payloads.

---

## 8. Test Naming

Test file names:

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

Test descriptions must describe expected behaviour.

Prefer:

```ts
it("rejects login when the password is invalid", ...)
it("prevents a user from updating another user's project", ...)
it("publishes task.created after a task is persisted", ...)
```

Avoid:

```ts
it("test login", ...)
it("works", ...)
it("case 1", ...)
```

---

## 9. Test Structure

Use a clear Arrange / Act / Assert structure.

Example:

```ts
it("creates a project for the authenticated user", async () => {
  // Arrange
  const input = { name: "Project Alpha" };

  // Act
  const result = await projectService.create(userId, input);

  // Assert
  expect(result.name).toBe("Project Alpha");
  expect(result.ownerId).toBe(userId);
});
```

Comments are optional when the structure is already obvious.

---

## 10. Test Data

Use explicit and minimal test data.

Prefer factories/builders when many tests need similar objects.

Examples:

```text
createUserFixture()
createProjectFixture()
createTaskFixture()
```

Do not share mutable test data between tests.

Avoid random values unless the random seed is controlled.

---

## 11. Mocking Rules

Mocks are useful for isolating external dependencies, but excessive mocking is forbidden.

Mock when:

- testing a service independently from persistence;
- simulating an external failure;
- isolating RabbitMQ or infrastructure in a unit test.

Do not mock the component that the test is supposed to validate.

Integration tests should use real infrastructure boundaries where practical.

---

## 12. Error and Edge-Case Testing

Relevant negative cases must be tested.

Examples:

- invalid credentials;
- duplicate email;
- invalid UUID;
- missing resource;
- forbidden resource access;
- invalid task status;
- invalid deadline;
- duplicate event;
- database constraint violation;
- unavailable event broker where recovery is expected.

Only testing the successful path is not sufficient for business-critical functionality.

---

## 13. Coverage

Initial target:

```text
>= 70% overall coverage
```

Coverage must be generated automatically in CI.

Coverage is not a substitute for meaningful tests.

Critical business rules should be covered even when the global threshold has already been reached.

---

## 14. CI Requirements

The CI pipeline must run the appropriate automated tests for every Pull Request.

At minimum:

```text
lint
typecheck
unit tests
coverage
build
```

Integration and E2E tests should be executed in CI once their infrastructure is available.

A failing required test blocks the Pull Request.

---

## 15. Pull Request Requirements

When a Pull Request changes business behaviour:

- relevant tests must be added or updated;
- existing relevant tests must continue to pass;
- the PR description should explain how the change was tested;
- required coverage must remain satisfied.

A feature that works locally but has no appropriate tests is not considered Done.

---

## 16. Definition of Done Alignment

Testing is part of the project Definition of Done.

An issue cannot move to `Done` when:

- required tests are missing;
- tests are failing;
- required coverage is not reached;
- relevant integration behaviour has not been validated.

---

## 17. Forbidden Practices

Do not:

- disable tests to make CI pass;
- use `.skip` or equivalent in committed code without a documented and temporary reason;
- depend on test execution order;
- use production credentials;
- use the production database;
- write tests that require manual intervention;
- use fixed delays when a deterministic wait condition is possible;
- test only implementation details instead of observable behaviour.
