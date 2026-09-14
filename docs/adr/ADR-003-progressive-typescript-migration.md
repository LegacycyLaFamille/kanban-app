# ADR-003 — Progressive JavaScript to TypeScript Migration

## Status

Accepted

## Date

2026-09-14

## Context

The existing application contains JavaScript and JSX, while the target architecture uses TypeScript.

Converting the entire application at once would mix architectural changes, language migration, and feature work in large Pull Requests.

## Decision

JavaScript and TypeScript will coexist temporarily.

New application code should be written in TypeScript.

Legacy JavaScript/JSX may remain unchanged while it is still required.

Migration occurs progressively when a legacy area is replaced or substantially modified.

File extensions follow:

- `.ts` for TypeScript without JSX
- `.tsx` for TypeScript containing JSX
- `.js` / `.jsx` only for legacy code that has not yet been migrated

Temporary compiler settings may allow JavaScript without forcing TypeScript checking on legacy files.

## Alternatives Considered

### Big-bang TypeScript conversion

Rejected because it creates unnecessary churn, large Pull Requests, and regression risk without delivering direct product value.

### Keep JavaScript for the whole project

Rejected because TypeScript improves contracts, refactoring safety, editor support, and maintainability for the target application.

## Consequences

### Positive

- Migration risk is distributed across smaller changes.
- New code benefits from static typing immediately.
- Legacy code remains operational during the transition.
- Teams can migrate features independently.

### Negative / Trade-offs

- JavaScript and TypeScript coexist temporarily.
- Tooling must support both languages during migration.
- Some legacy areas have weaker type guarantees until replaced.

## Implementation Notes

Do not add unnecessary typing work to code that is scheduled for removal.

TypeScript strictness may be increased progressively as legacy code disappears.

## Related Documentation

- `docs/architecture/FRONTEND_MIGRATION.md`
- `docs/architecture/BACKEND_MIGRATION.md`
- `docs/standards/DEVELOPMENT_CONVENTIONS.md`

## Supersedes

None

## Superseded By

None
