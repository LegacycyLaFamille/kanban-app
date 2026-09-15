# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for the Kanban App project.

ADRs document important architectural decisions, why they were made, the alternatives considered, and their consequences.

## Status values

- `Proposed`: under discussion
- `Accepted`: approved and currently applicable
- `Deprecated`: no longer recommended
- `Superseded`: replaced by another ADR

## ADR index

| ADR | Title | Status |
| --- | --- | --- |
| ADR-001 | Incremental Legacy Modernization | Accepted |
| ADR-002 | Modular Monolith Backend Architecture | Accepted |
| ADR-003 | Progressive JavaScript to TypeScript Migration | Accepted |
| ADR-004 | Feature-Based Frontend Architecture | Accepted |
| ADR-005 | REST API for Frontend/Backend Communication | Accepted |
| ADR-006 | PostgreSQL and Prisma for Target Persistence | Accepted |
| ADR-007 | Do Not Automatically Migrate Legacy Todo Data | Accepted |
| ADR-008 | RabbitMQ for Event-Driven Workflows | Accepted |
| ADR-009 | Reshaped as the Frontend UI Foundation | Accepted |

## Naming convention

New ADRs should use:

`ADR-XXX-short-title.md`

The French translation should use:

`ADR-XXX-short-title.fr.md`

Use `ADR-000-TEMPLATE.md` as the starting point for new decisions.
