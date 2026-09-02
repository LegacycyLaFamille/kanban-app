# Code Quality Standards

## Tooling
The quality pipeline uses:
- **ESLint** as the JavaScript/TypeScript linter;
- **TypeScript** static type checking;
- automated tests;
- coverage reporting;
- static code-quality analysis such as SonarQube or SonarCloud;
- GitHub Actions CI.

If Prettier is enabled, it is the formatter; ESLint remains the linter.

## ESLint
ESLint runs on frontend and backend code.

Expected scripts:
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

Pull Requests accept zero lint errors.

## Type checking
Run TypeScript checking independently:
```text
tsc --noEmit
```

CI fails on type errors.

Avoid `any` without a documented reason.

## Validation
Validate all external input:
- HTTP bodies;
- route parameters;
- query parameters;
- environment variables;
- event payloads.

A schema validation library such as Zod may be used.

## Tests
Each feature includes appropriate tests.

Levels:
- unit tests;
- integration tests;
- end-to-end tests.

Minimum critical E2E workflow:
```text
Register
→ Login
→ Create Project
→ Create Task
→ Move Task
→ Update Task
→ Delete Task
```

## Coverage
Initial project target:
```text
>= 70% overall coverage
```

Critical business rules must still be tested even when the global threshold is reached.

## Static analysis
The quality tool should report:
- bugs;
- vulnerabilities;
- security hotspots;
- code smells;
- duplicated code;
- maintainability issues;
- coverage when supported.

No new blocker or critical issues are accepted.

## Initial Quality Gate
```text
Lint errors             = 0
Type errors             = 0
Automated tests         = PASS
Critical issues         = 0
Blocker issues          = 0
New vulnerabilities     = 0
Coverage                >= 70%
Build                    = PASS
```

## Pull Request rules
Do not merge when:
- lint fails;
- type checking fails;
- tests fail;
- quality gate fails;
- required coverage is not reached;
- required documentation is missing;
- review requirements are not satisfied.
