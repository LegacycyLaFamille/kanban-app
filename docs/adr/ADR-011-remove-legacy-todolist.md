# ADR-011 — Remove the Legacy TodoList Application

## Status

Proposed

## Date

2026-10-02

## Context

[ADR-001](ADR-001-incremental-legacy-modernization.md) kept the legacy
TodoList running until the Kanban application replaced it, and
[ADR-010](ADR-010-landing-page-and-legacy-route.md) moved it to `/legacy`.
The Kanban application now covers and goes beyond everything the TodoList
did (tasks, statuses, accounts, projects), and it is tested, audited and
deployed.

Keeping the legacy application had become a cost with no user:

- an unauthenticated API (`/api/legacy/items`) open to anyone reaching the
  backend (noted in the [authorization audit](../audit/AUTHORIZATION_AUDIT.md));
- CommonJS code excluded from linting, coverage and SonarQube;
- two frontend dependencies (`bootstrap`, `react-bootstrap`) and an ESLint
  plugin used by nothing else;
- the `/legacy` route was already gone from the router, while the admin
  sidebar still linked to it (a dead link).

## Decision

Remove the legacy TodoList application: `frontend/src/app/legacy/`,
`backend/src/legacy/`, the `/api/legacy` API, the `/items` proxies (nginx
and Vite), the admin "Legacy" sidebar entry, its CI smoke test, its lint,
coverage and SonarQube exclusions, and its dependencies.

**Keep the legacy data and its migration tooling** until every deployed
stack has been archived:

- `backend/src/scripts/migrate-legacy-data.ts` (and
  `scripts/migrate-legacy-data.sh`), the `LegacyTodoItem` archive table
  ([ADR-007](ADR-007-no-legacy-data-migration.md)), and the `sqlite3` /
  `mysql2` drivers it needs;
- the `backend-data` volume and `SQLITE_DB_LOCATION=/data/todo.db`, which
  still hold the TodoList's data on the deployed stacks.

## Alternatives Considered

### Remove everything, data and tooling included

Rejected for now: if a stack's TodoList data was not archived yet, dropping
the volume or the script would lose it for good.

### Keep the legacy application on `/legacy`

Rejected: no user needs it any more, and it keeps an unauthenticated API
and unchecked code in the product.

## Consequences

### Positive

- No unauthenticated endpoint left; every source file is linted, measured
  and analysed by SonarQube.
- Smaller frontend bundle and dependency tree.

### Negative / Trade-offs

- The TodoList is no longer reachable: its data is only kept in the
  `LegacyTodoItem` archive (after migration) and in the volume.
- The migration tooling and the `backend-data` volume remain until the
  follow-up below.

## Implementation Notes

On each deployed stack (`~/kanban-dev`, `~/kanban-main`), run
`./scripts/migrate-legacy-data.sh --dry-run`, then
`./scripts/migrate-legacy-data.sh` ([LEGACY_DATA_MIGRATION.md](../backend/LEGACY_DATA_MIGRATION.md)).
Once every stack is archived, a follow-up can remove the script, the two
drivers, `SQLITE_DB_LOCATION` and the `backend-data` volume.

## Related Documentation

- [ADR-001 — Incremental Legacy Modernization](ADR-001-incremental-legacy-modernization.md)
- [ADR-007 — Do Not Automatically Migrate Legacy Todo Data](ADR-007-no-legacy-data-migration.md)
- [ADR-010 — Landing Page on `/`, Legacy App Moved to `/legacy`](ADR-010-landing-page-and-legacy-route.md)

## Supersedes

ADR-010, for the `/legacy` route only (the landing page on `/` stays).

## Superseded By

None
