# ADR-007 — Do Not Automatically Migrate Legacy Todo Data

## Status

Accepted

## Date

2026-09-14

## Context

The legacy `todo_items` model contains no user, owner, project, membership, or authorization relationship.

The target application introduces authenticated users and a `User -> Project -> Task` ownership model.

Automatically assigning old Todo records to new users would require inventing ownership information that does not exist in the legacy data.

Exposing all legacy Todo records to all users would conflict with the target authorization model and create unnecessary privacy and disclosure risk.

## Decision

Legacy Todo business records will not be automatically migrated into the new Project/Task domain.

The target database schema will still be created and versioned through Prisma migrations. This ADR concerns legacy business data records, not the technical creation of the new database schema.

Before the migration is finalized, users should be informed that old Todo records cannot be reliably associated with accounts and should preserve any information they still need.

Relevant tasks can then be recreated in the authenticated Project/Task model.

## Alternatives Considered

### Assign all legacy tasks to a default user

Rejected because ownership would be fabricated and could be incorrect.

### Expose legacy tasks to every authenticated user

Rejected because it would contradict the target authorization model and could disclose data to unauthorized users.

### Attempt heuristic ownership mapping

Rejected because the legacy model does not contain sufficient reliable information for a trustworthy mapping.

## Consequences

### Positive

- No fabricated ownership data.
- Target authorization rules remain coherent.
- Reduces unnecessary privacy and disclosure risk.
- Keeps the new domain model clean.

### Negative / Trade-offs

- Historical Todo data continuity is intentionally broken.
- Users may need to recreate still-relevant tasks manually.
- Communication before migration is required.

## Implementation Notes

Do not state that privacy law automatically forbids migration. The decision is based on the absence of reliable ownership and authorization information and the resulting privacy and security risk.

The decision should be clearly communicated before old data becomes unavailable.

## Related Documentation

- `docs/audit/`
- `docs/architecture/BACKEND_MIGRATION.md`

## Supersedes

None

## Superseded By

None
