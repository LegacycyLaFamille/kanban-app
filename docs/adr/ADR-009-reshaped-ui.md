# ADR-009 — Reshaped as the Frontend UI Foundation

## Status

Accepted

## Date

2026-09-14

## Context

The new frontend requires accessible, consistent UI components for forms, buttons, cards, modals, navigation, feedback, and layouts.

The project has a short delivery period and should focus development effort on Kanban business functionality rather than building and maintaining a complete custom design system.

The legacy frontend currently uses React-Bootstrap, but that dependency belongs to the temporary legacy UI and should not define the target frontend.

## Decision

Reshaped will be used as the UI component and design-system foundation for new frontend features.

New feature code may use Reshaped components and tokens directly.

Application-specific components should be built on top of Reshaped where useful.

React-Bootstrap remains only where required by the temporary legacy frontend and should disappear when the legacy UI is removed.

## Alternatives Considered

### Build a custom component library

Rejected because it would consume significant time on low-value infrastructure during a short project.

### Continue React-Bootstrap for the target frontend

Rejected because it is primarily retained for legacy compatibility and does not represent the desired target design direction.

### Use a larger UI library such as MUI

Considered, but Reshaped was selected for its design-system-oriented primitives, TypeScript support, accessibility focus, theming, and fit with the chosen visual direction.

## Consequences

### Positive

- Faster delivery of consistent interfaces.
- Accessible components available by default.
- Shared tokens and theming.
- Less custom CSS for common UI controls.
- Clear separation between legacy Bootstrap UI and target UI.

### Negative / Trade-offs

- Adds a third-party UI dependency.
- The team must follow Reshaped APIs and upgrade path.
- Highly customized interactions may still require application-specific styling.

## Implementation Notes

Do not wrap every Reshaped primitive in a custom component without a real application-level reason.

Use `shared/components/` for reusable application components, not for duplicating the Reshaped API.

Pin the dependency version during the project to reduce unexpected changes.

## Related Documentation

- `docs/architecture/FRONTEND_MIGRATION.md`
- `docs/standards/DEVELOPMENT_CONVENTIONS.md`

## Supersedes

None

## Superseded By

None
