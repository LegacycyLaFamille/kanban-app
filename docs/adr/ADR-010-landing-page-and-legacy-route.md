# ADR-010 — Landing Page on `/`, Legacy App Moved to `/legacy`

## Status

Proposed

## Date

2026-10-01

## Context

Until now, the root route `/` rendered the original TodoList
(`frontend/src/app/legacy/LegacyApp.jsx`). A visitor opening the
application therefore landed on the legacy app, with no presentation of the
Kanban product and no direct way to sign up or sign in: those were only on
`/login` and `/register`.

[ADR-001](ADR-001-incremental-legacy-modernization.md) requires the legacy
application to stay operational until its replacement is validated, so it
cannot simply be removed.

## Decision

- `/` renders a landing page (`frontend/src/features/landing/`): product
  presentation, and sign-in / sign-up forms in the page itself.
- The legacy TodoList stays available, unchanged, on **`/legacy`**. The
  "Legacy" entry of the admin sidebar points there.
- The login and register forms are shared components
  (`features/auth/components/LoginForm.tsx`, `RegisterForm.tsx`) used by
  both the landing page and the `/login` / `/register` pages.

## Alternatives Considered

### Keep the legacy app on `/`, landing page elsewhere

Rejected: the first thing every visitor sees would stay the legacy app, and
links to the product would need a separate entry URL.

### Remove the legacy app

Rejected: contradicts ADR-001, its replacement is not validated by every
stakeholder yet.

## Consequences

### Positive

- New visitors see the product and can create an account in one place.
- The legacy app remains reachable and untouched.
- No duplicated form logic between the landing page and the auth pages.

### Negative / Trade-offs

- Bookmarks and links to `/` that expected the legacy app now land on the
  landing page. Users of the legacy app must be told about `/legacy`.
- The landing page is a new, animated page to keep accessible (see
  [ACCESSIBILITY_RGAA.md §3.9](../standards/ACCESSIBILITY_RGAA.md)).

## Implementation Notes

- Routing: `frontend/src/app/router.tsx`.
- Behaviour, accessibility and motion: [docs/frontend/FEATURES.md](../frontend/FEATURES.md#landing-page-).
- When the legacy app is finally removed, delete the `/legacy` route and the
  admin "Legacy" entry together with `frontend/src/app/legacy/`.

## Related Documentation

- [ADR-001 — Incremental Legacy Modernization](ADR-001-incremental-legacy-modernization.md)
- [docs/frontend/FEATURES.md](../frontend/FEATURES.md)

## Supersedes

None

## Superseded By

[ADR-011](ADR-011-remove-legacy-todolist.md), for the `/legacy` route: the legacy app has been removed.
