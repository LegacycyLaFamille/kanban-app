# Architecture Decision Records

Ce dossier contient les Architecture Decision Records (ADR) du projet Kanban App.

Les ADR documentent les décisions d'architecture importantes, les raisons de ces décisions, les alternatives étudiées et leurs conséquences.

## Statuts

- `Proposed` : en cours de discussion
- `Accepted` : approuvé et actuellement applicable
- `Deprecated` : n'est plus recommandé
- `Superseded` : remplacé par un autre ADR

## Index des ADR

| ADR | Titre | Statut |
| --- | --- | --- |
| ADR-001 | Modernisation incrémentale du legacy | Accepted |
| ADR-002 | Architecture backend en monolithe modulaire | Accepted |
| ADR-003 | Migration progressive de JavaScript vers TypeScript | Accepted |
| ADR-004 | Architecture frontend orientée fonctionnalités | Accepted |
| ADR-005 | API REST pour la communication frontend/backend | Accepted |
| ADR-006 | PostgreSQL et Prisma pour la persistence cible | Accepted |
| ADR-007 | Ne pas migrer automatiquement les anciennes Todo | Accepted |
| ADR-008 | RabbitMQ pour les workflows event-driven | Accepted |
| ADR-009 | Reshaped comme fondation UI frontend | Accepted |

## Convention de nommage

Les nouveaux ADR doivent suivre :

`ADR-XXX-short-title.md`

La traduction française doit suivre :

`ADR-XXX-short-title.fr.md`

Utilisez `ADR-000-TEMPLATE.md` comme base pour toute nouvelle décision.
