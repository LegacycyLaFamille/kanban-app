# kanban-app — Documentation Index

**Baseline version:** 1.0.1  
**Baseline date:** 2026-09-01  
**Project:** TodoList → Kanban Application Rework  
**Repository documentation:** English is the reference language. French translations use the `.fr.md` suffix.

## Documents

| Document | Purpose | English | French |
|---|---|---|---|
| Project Specification | Product vision, functional scope, requirements, MoSCoW, roles, entities and roadmap | `01-PROJECT-SPECIFICATION.md` | `01-PROJECT-SPECIFICATION.fr.md` |
| Technical Architecture | Target architecture, modules, diagrams, stack, data, events, security, CI/CD, mirroring and deployment | `02-TECHNICAL-ARCHITECTURE.md` | `02-TECHNICAL-ARCHITECTURE.fr.md` |
| Delivery & Governance | Scrum execution, Git/PR workflow, Definition of Done, quality policy and sprint objectives | `03-DELIVERY-GOVERNANCE.md` | `03-DELIVERY-GOVERNANCE.fr.md` |
| Backlog & Roadmap | Implementation sequence, epics, baseline tasks, dependencies and post-MVP evolution | `04-BACKLOG-ROADMAP.md` | `04-BACKLOG-ROADMAP.fr.md` |
| Technical Debt Register | Evidence-based legacy debt inventory, prioritization, intentional debt and remediation tracking | `05-TECHNICAL-DEBT.md` | `05-TECHNICAL-DEBT.fr.md` |

## Source of truth

The documents define the architectural and product baseline. The GitHub Project board is the operational source of truth for the live state of tasks, assignees, estimates and sprint progress.

When a significant architectural decision changes, update `02-TECHNICAL-ARCHITECTURE.md` first and record the reason in its Architecture Decision Log.

When product scope or MoSCoW priority changes, update `01-PROJECT-SPECIFICATION.md` and then align the backlog.

When technical debt is discovered, accepted, remediated or verified, update `05-TECHNICAL-DEBT.md` and link the corresponding GitHub issue/PR evidence.

# Project Standards

This directory contains the engineering standards used by the Kanban rework project.

## Documents
- [Naming Conventions](./docs/standards/NAMING_CONVENTIONS.md)
- [Git Conventions](./docs/standards/GIT_CONVENTIONS.md)
- [Code Quality](./docs/standards/CODE_QUALITY.md)
- [API and Backend Conventions](./docs/standards/API_CONVENTIONS.md)
- [Testing conventions](./docs/standards/TESTING_CONVENTIONS.md)

French versions use the `.fr.md` suffix.

These standards apply to every contribution unless an ADR explicitly documents an exception.
