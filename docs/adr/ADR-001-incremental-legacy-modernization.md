# ADR-001 — Incremental Legacy Modernization

## Status

Accepted

## Date

2026-09-14

## Context

The project starts from an existing TodoList application that contains technical debt and does not provide the architecture or functionality required by the target Kanban product.

The application must be understood before being changed, and the existing behaviour must remain available while the new architecture is introduced.

A complete rewrite would remove the existing operational baseline, create a large integration risk, and make it harder to demonstrate controlled modernization of a legacy system.

## Decision

The project will use an incremental legacy modernization strategy.

Legacy code is isolated behind explicit boundaries and replaced progressively.

The migration sequence is:

1. Audit and understand the current system.
2. Preserve a working legacy baseline.
3. Add characterization tests and quality safeguards.
4. Isolate legacy frontend and backend code.
5. Introduce the target architecture around the legacy system.
6. Replace functionality progressively.
7. Remove legacy code only after its replacement is operational and validated.

The current legacy boundaries include:

- `frontend/src/app/legacy/`
- `backend/src/legacy/`

## Alternatives Considered

### Full rewrite

Rejected because it would introduce excessive delivery and regression risk for a short project and would discard the existing operational baseline.

### Keep the legacy architecture unchanged

Rejected because the current application does not provide the maintainability, security, domain model, testing, or delivery foundations required by the target product.

## Consequences

### Positive

- Existing behaviour remains available during migration.
- Changes can be delivered through smaller Pull Requests.
- Regression risk is reduced.
- Legacy code is clearly separated from new code.
- The migration path remains demonstrable and traceable.

### Negative / Trade-offs

- Legacy and target architectures coexist temporarily.
- Some temporary adapters and compatibility configuration are required.
- The repository is temporarily more complex during the transition.

## Implementation Notes

Do not refactor legacy code only because it is old.

A legacy component may be removed only when its replacement exists, works, and no active dependency still relies on the old implementation.

## Related Documentation

- `docs/audit/`
- `docs/architecture/FRONTEND_MIGRATION.md`
- `docs/architecture/BACKEND_MIGRATION.md`

## Supersedes

None

## Superseded By

None
