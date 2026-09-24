# Quality Gate

This document describes the checks required to merge a Pull Request into
`main` or `Dev`, why the legacy exceptions exist, and the manual setup steps
a human has to complete outside of this repository (GitHub rulesets and
SonarQube Cloud are UI-configured, not stored as files).

Related documents: [`docs/standards/CODE_QUALITY.md`](standards/CODE_QUALITY.md),
[`docs/standards/TESTING_CONVENTIONS.md`](standards/TESTING_CONVENTIONS.md).

## 1. Required checks

All checks run on every Pull Request targeting `main` or `Dev`
(`.github/workflows/lint.yml`, triggered on `pull_request`).

| Check                | Job                  | What it enforces                                             |
| --------------------- | -------------------- | -------------------------------------------------------------- |
| Frontend lint         | `lint-frontend`       | ESLint, no errors                                              |
| Frontend format       | `format-frontend`     | Prettier `--check`                                             |
| Frontend type-check   | `typecheck-frontend`  | `tsc -b --noEmit`, no type errors                              |
| Backend lint          | `lint-backend`        | ESLint, no errors                                              |
| Backend format        | `format-backend`      | Prettier `--check`                                             |
| Backend type-check    | `typecheck-backend`   | `tsc --noEmit`, no type errors                                 |
| Backend tests         | `test-backend`        | Vitest, all tests pass, plus the coverage threshold (see §3)   |
| SonarQube Quality Gate | `sonarqube`          | No new Blocker/Critical issues on New Code (see §4)            |

Type-checking and the full `build` script are kept separate on purpose:
type-check jobs run `tsc --noEmit` / `tsc -b --noEmit` so they stay fast and
have no side effects (no emitted files, no bundling), while `build` remains
the script used for actually producing a build artifact.

The backend type-check job runs `prisma generate` first (with a placeholder
`DATABASE_URL`, since `generate` only reads the schema and never connects to
a database) because the Prisma client types are generated, not committed.

## 2. Legacy exceptions (explicit and scoped)

Two directories hold pre-migration code that is being kept as-is while the
rest of the codebase migrates to TypeScript, per
[`docs/architecture/FRONTEND_MIGRATION.md`](architecture/FRONTEND_MIGRATION.md) and
[`docs/architecture/BACKEND_MIGRATION.md`](architecture/BACKEND_MIGRATION.md):

- `frontend/src/app/legacy/**` — CommonJS-era JSX kept working during the
  frontend migration.
- `backend/src/legacy/**` — CommonJS code (with its own local
  `package.json` `{"type": "commonjs"}` override) kept working during the
  backend migration.

These are relaxed, not silently skipped, and only in these two places:

- **ESLint** (`frontend/eslint.config.js`, `backend/eslint.config.js`)
  applies a separate, looser rule set to these paths instead of the strict
  TypeScript/React rules used for new code.
- **SonarQube** (`sonar-project.properties`) excludes both paths from
  analysis entirely via `sonar.exclusions`, with an inline comment
  explaining why.
- **Coverage** (`backend/vitest.config.ts`) excludes `src/legacy/**` so
  untested legacy code doesn't inflate or deflate the coverage number in
  either direction.

The exception is temporary and scoped to these two directories: as a legacy
module is migrated, it moves out of `legacy/` and back under the strict
rules — the exclusion list should shrink over time, not grow.

## 3. Coverage threshold

Backend coverage is measured by Vitest (`@vitest/coverage-v8`) across the
whole `src/**/*.ts` tree (`all: true` in `backend/vitest.config.ts`), not
just the files touched by existing tests, so the number reflects the real
state of the codebase rather than the tested subset.

Current threshold: **20%** (statements, branches, functions, lines).

Rationale: coverage thresholds previously lived in a root `package.json`
that was removed when the repo split into `frontend/`/`backend/`
(`chore: remove obsolete root-level config and package files after full
frontend/backend split`). The new TypeScript backend started from
near-zero coverage; at the time of writing it measures ~23% across the
whole tree. 20% is an honest baseline set just below that so the gate is
real (it can fail) without being unrealistic. **Raise this threshold as
tests are added — do not lower it to make CI pass.** The long-term target
agreed in `docs/standards/CODE_QUALITY.md` / `TESTING_CONVENTIONS.md` is
`>= 70%` overall.

Run locally with:

```bash
cd backend
npm run test:coverage
```

The frontend has no tests yet, so no frontend coverage threshold is
enforced. Add one (Vitest + React Testing Library, per
`docs/standards/TESTING_CONVENTIONS.md`) once frontend tests exist.

## 4. SonarQube Cloud Quality Gate

The `sonarqube` CI job runs `sonarsource/sonarqube-scan-action` followed by
`sonarsource/sonarqube-quality-gate-action`, which polls the analysis result
and fails the job if the Quality Gate does not pass.

The Quality Gate itself is configured in the SonarQube Cloud UI (there is
no repo file for this) to:

- Evaluate **New Code only** (SonarQube's "new code period"), not
  pre-existing legacy debt. This is what lets legacy code keep migrating
  incrementally without the gate blocking unrelated PRs.
- Fail on any new **Blocker** or **Critical** issue.

`sonar-project.properties` defines a single logical project covering both
`frontend/src` and `backend/src` (simpler than two Sonar projects for a
monorepo this size) and excludes the legacy paths as described in §2.

### Manual setup (SonarQube Cloud) — human action required

These steps must be done once by someone with access to create a SonarQube
Cloud account/organization; they cannot be automated from this repo:

1. Go to <https://sonarcloud.io/> and sign in with the GitHub account/org
   that owns `LegacycyLaFamille/kanban-app`.
2. Create (or select) an organization for the team, and note its key —
   update `sonar.organization` in `sonar-project.properties` to match if it
   differs from the placeholder `legacycylafamille`.
3. Import the `LegacycyLaFamille/kanban-app` GitHub repository as a new
   project. Note the generated project key and update
   `sonar.projectKey` in `sonar-project.properties` if it differs from the
   placeholder.
4. In the project's **Analysis Method**, choose "GitHub Actions" (CI-based
   analysis, since this repo already runs its own workflow) rather than
   Automatic Analysis.
5. Generate a token: **My Account > Security > Generate Token**, scoped to
   this project.
6. In the GitHub repo, go to **Settings > Secrets and variables > Actions**
   and add a repository secret named `SONAR_TOKEN` with that token value.
   The `sonarqube` CI job expects this secret to exist; until it does, the
   job will fail (expected — it is not yet a required check, see §5).
7. In the SonarQube Cloud project's **Quality Gate** settings:
   - Assign (or create) a Quality Gate scoped to **New Code**.
   - Ensure its conditions include "0 new Blocker issues" and "0 new
     Critical issues" (SonarQube Cloud's default "Sonar way" gate already
     does this via its Reliability/Security/Maintainability Rating
     conditions on New Code — verify rather than assume).

## 5. GitHub ruleset — required status checks

GitHub rulesets are configured in the GitHub UI (Settings > Rules >
Rulesets), not stored as repository files. After the checks above land and
`SONAR_TOKEN` is set up, update the ruleset(s) covering `main` and `Dev` to
require these status checks (Settings > Rules > Rulesets > select the
ruleset > Require status checks to pass):

- `lint-frontend`
- `format-frontend`
- `typecheck-frontend` *(new)*
- `lint-backend`
- `format-backend`
- `typecheck-backend` *(new)*
- `test-backend`
- `sonarqube` *(new — add only once `SONAR_TOKEN` is configured and the
  job has run successfully at least once, otherwise every PR is blocked)*

Steps:

1. GitHub repo → **Settings** → **Rules** → **Rulesets**.
2. Open the ruleset covering `main` (and, separately, the one covering
   `Dev`, if they are configured independently).
3. Under **Branch rules**, ensure **Require status checks to pass** is
   enabled.
4. Add each check name listed above under **Status checks that are
   required**. GitHub only lists a check as selectable once it has run at
   least once on a PR/branch in this repo — merge one PR with the new jobs
   present (even without them being required yet) before adding them here.
5. Save the ruleset.

## 6. Definition of Done, quality-gate slice

A PR is not Done unless:

- Lint, format, and type-check pass for every workspace the change
  touches.
- Required backend tests pass and the coverage threshold in §3 is met.
- The SonarQube Quality Gate passes on New Code (§4).
- Any new legacy exception is justified inline in the config that adds it
  (no blanket/undocumented exclusions).
- This document is updated if the change affects any of the above.
