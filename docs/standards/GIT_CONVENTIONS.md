# Git Conventions

## Conventional Commits
The project uses Conventional Commits.

Format:
```text
<type>(optional-scope): <description>
```

Examples:
```text
feat(auth): add login endpoint
fix(tasks): reject invalid task status
refactor(projects): isolate repository access
test(auth): add invalid password cases
docs(api): document project endpoints
ci: add lint job
chore: update dependencies
```

Allowed types:
- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `style`
- `perf`
- `ci`
- `build`
- `chore`
- `revert`

Descriptions use the imperative mood, start with a lowercase letter, stay concise, and do not end with a period.

## Branches
Default branch: `main`.

All work is performed on short-lived branches created from the latest `main`.

Prefixes:
`feature/`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/`, `ci/`.

Format:
```text
<type>/<issue-id>-<short-description>
```

Examples:
```text
feature/S1-17-login
feature/S1-20-project-crud
fix/S2-08-task-form-validation
ci/S1-31-github-actions
```

One issue should normally map to one branch.

## Pull Requests
PR titles should follow Conventional Commits when practical.

Every PR must:
- link the corresponding issue;
- remain focused;
- pass CI;
- receive at least one approval;
- include tests when business logic changes;
- update documentation when required.

Link an issue with:
```text
Closes #42
```

## Merge strategy
Preferred strategy: **Squash and merge**.

The final squash commit must follow Conventional Commits.

## Protected main
`main` should require:
- Pull Request before merge;
- at least one approval;
- successful CI checks;
- resolved review conversations;
- no direct pushes.

Required checks should cover:
`lint`, `typecheck`, `tests`, `coverage`, `code quality`, `build`.

## Workflow
```text
Backlog
→ Ready
→ In Progress
→ In Review
→ Testing
→ Done
```

Use `Blocked` when progress is impossible.

## Forbidden practices
Do not:
- push directly to `main`;
- mix unrelated issues in one PR;
- merge with failing CI;
- bypass review;
- use vague commits such as `update`, `fix stuff`, `work`, or `changes`;
- commit credentials, tokens, `.env` secrets, or `node_modules`.
