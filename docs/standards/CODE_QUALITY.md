# Code Quality Standards

## 1. Purpose

These standards apply throughout the incremental migration of the legacy JavaScript application to the TypeScript target architecture.

Quality rules must improve the codebase progressively without requiring a big-bang rewrite.

---

## 2. Tooling

The quality pipeline uses:

- **ESLint** for JavaScript and TypeScript;
- **TypeScript** static type checking;
- automated tests;
- coverage reporting;
- static analysis such as SonarQube or SonarCloud;
- GitHub Actions CI.

If Prettier is enabled, it is the formatter; ESLint remains the linter.

---

## 3. ESLint

ESLint must cover both legacy JavaScript and new TypeScript during migration.

Expected scripts:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

New or modified code must not introduce lint errors.

Temporary exceptions in untouched legacy code must be explicit, limited, and documented rather than hidden globally.

---

## 4. TypeScript

TypeScript is introduced progressively.

JavaScript and TypeScript may coexist temporarily.

New code should be TypeScript whenever practical. Migrated modules must pass type checking.

Recommended command:

```text
tsc --noEmit
```

Avoid `any` unless technically justified.

---

## 5. Input Validation

Validate all external input:

- HTTP bodies;
- route parameters;
- query parameters;
- environment variables;
- RabbitMQ event payloads.

A schema library such as Zod may be used.

---

## 6. Tests and Coverage

Every new or modified business rule requires appropriate tests.

Initial target:

```text
>= 70% overall coverage
```

During migration, the team must also monitor coverage of new and changed code so that legacy gaps are not used to justify untested new functionality.

---

## 7. Static Analysis

Static analysis should report:

- bugs;
- vulnerabilities;
- security hotspots;
- code smells;
- duplication;
- maintainability issues;
- coverage where supported.

No new blocker or critical issue is accepted.

Existing legacy findings should be tracked as technical debt and reduced progressively according to priority.

---

## 8. Initial Quality Gate

```text
New lint errors          = 0
Type errors              = 0
Required tests           = PASS
New critical issues      = 0
New blocker issues       = 0
New vulnerabilities      = 0
Coverage                 >= agreed target
Build                    = PASS
```

The gate may become stricter as legacy debt is reduced.

---

## 9. Pull Request Rules

Do not merge when:

- required lint checks fail;
- TypeScript checks fail for migrated/new code;
- required tests fail;
- the blocking quality gate fails;
- required documentation is missing;
- review requirements are not satisfied.

A migration PR must remain focused and must not mix unrelated architectural changes.

---

## 10. Definition of Done

A completed issue must satisfy the project Definition of Done, including:

- implementation completed;
- appropriate tests added;
- quality checks passed;
- CI passed;
- documentation updated;
- Pull Request approved;
- Docker/build artifact produced when applicable.
