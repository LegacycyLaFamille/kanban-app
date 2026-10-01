# Documentation du projet Kanban

Ce dossier constitue le point d’entrée de la documentation technique du projet de modernisation de la TodoList legacy vers l’application Kanban.

## Ligne directrice

Le projet est traité comme la modernisation incrémentale d’une application legacy d’entreprise :

```text
Audit du legacy
      ↓
Baseline et tests de caractérisation
      ↓
Qualité / CI / garde-fous
      ↓
Migration progressive JavaScript → TypeScript
      ↓
Refactor architectural
      ↓
Frontend feature-based
      ↓
Backend monolithe modulaire
      ↓
Prisma + PostgreSQL
      ↓
Todo → Users / Projects / Tasks / Kanban
      ↓
RabbitMQ / Event-driven
      ↓
Docker / livraison
```

La cible technique principale est :

```text
React + TypeScript
        │
        │ REST / JSON
        ▼
Node.js + Express + TypeScript
        │
        ▼
Controllers
        │
        ▼
Services
        │
   ┌────┴────┐
   ▼         ▼
Repositories Events
   │         │
   ▼         ▼
Prisma    RabbitMQ
   │
   ▼
PostgreSQL
```

L’application reste un **monolithe modulaire**. La migration est progressive et non une réécriture complète.

## Ce que fait l'application aujourd'hui

- **Landing page** sur `/` : présentation du produit, connexion / création de compte.
- **Authentification** : inscription, connexion, session par cookies HTTP-only avec rafraîchissement, profil.
- **Projets** : CRUD, plusieurs **boards** par projet, équipe avec rôles **EDITOR / VIEWER** et **invitations**.
- **Kanban** : un board par page, glisser-déposer (avec alternative clavier), priorités, échéances, assignation, cartes colorées.
- **My Tasks**, **notifications** (événementielles, RabbitMQ), **export de données**, **tableau de bord admin**.
- **Accessibilité** : checklist RGAA, audit axe automatisé de toutes les pages, palette daltonienne.
- **Observabilité** : OpenTelemetry, Prometheus, Loki, Tempo, Grafana.
- La TodoList legacy reste disponible sur `/legacy`.

Pas encore fait : changement de mot de passe et suppression de compte (les boutons du profil existent, pas les routes backend), déclaration d'accessibilité, tests frontend en CI.

Route par route : [docs/frontend/FEATURES.md](./docs/frontend/FEATURES.md).

## Démarrer

- Backend (API, PostgreSQL, RabbitMQ) : [docs/backend/Get_started.md](./docs/backend/Get_started.md)
- Frontend : [frontend/README.md](./frontend/README.md)
- Toute la stack avec Docker : renseigner `JWT_SECRET` et `RABBITMQ_PASSWORD` dans un `.env` à la racine, lancer `docker compose up -d`, puis ouvrir <http://localhost:8080>
- Nouveau membre de l'équipe : [docs/team/ONBOARDING.fr.md](./docs/team/ONBOARDING.fr.md)

## Organisation des documents

### Audit

- [`audit/LEGACY_AUDIT.fr.md`](./docs/audit/LEGACY_AUDIT.fr.md) — état des lieux technique complet du repository legacy : stack, versions, architecture, dette technique, sécurité, tests, CI/CD, Docker, persistence et recommandations.

### Architecture et décisions

- [`architecture/FRONTEND_MIGRATION.fr.md`](./docs/architecture/FRONTEND_MIGRATION.fr.md) — stratégie de migration du frontend et état actuel
- [`architecture/BACKEND_MIGRATION.fr.md`](./docs/architecture/BACKEND_MIGRATION.fr.md) — stratégie de migration du backend, modèle de données, autorisations
- [`adr/`](./docs/adr/README.fr.md) — décisions d'architecture (ADR-001 à ADR-010)

### Backend (en anglais)

- [`backend/Get_started.md`](./docs/backend/Get_started.md) — installation locale, mise à jour de la base
- [`backend/PROJECTS_AND_ACCESS.md`](./docs/backend/PROJECTS_AND_ACCESS.md) — rôles, invitations, boards, assignation
- [`backend/EVENTS.md`](./docs/backend/EVENTS.md) — événements métier et bus d'événements
- [`backend/RABBITMQ.md`](./docs/backend/RABBITMQ.md) — configuration et topologie RabbitMQ
- [`backend/NOTIFICATIONS.md`](./docs/backend/NOTIFICATIONS.md) — qui est notifié, API, frontend
- [`backend/ADMIN_ROLE.md`](./docs/backend/ADMIN_ROLE.md) — rôle administrateur
- [`backend/DATA_EXPORT.md`](./docs/backend/DATA_EXPORT.md) — export des données utilisateur
- [`backend/LEGACY_DATA_MIGRATION.md`](./docs/backend/LEGACY_DATA_MIGRATION.md) — archivage des todos legacy
- [`backend/OBSERVABILITY.md`](./docs/backend/OBSERVABILITY.md), [`backend/OBSERVABILITY_DEMO.md`](./docs/backend/OBSERVABILITY_DEMO.md) — métriques, logs, traces, dashboards
- [`backend/INTEGRATION_TESTS.md`](./docs/backend/INTEGRATION_TESTS.md) — tests contre un vrai PostgreSQL et RabbitMQ
- Référence de l'API : `backend/docs/openapi.yaml`, servie sur `/api-docs`

### Frontend (en anglais)

- [`frontend/FEATURES.md`](./docs/frontend/FEATURES.md) — routes, fonctionnalités, landing page, couleurs des tâches, palette daltonienne
- [`frontend/TESTING.md`](./docs/frontend/TESTING.md) — tests unitaires et E2E

### Standards de développement

Point d'entrée : [`standards/DEVELOPMENT_CONVENTIONS.fr.md`](./docs/standards/DEVELOPMENT_CONVENTIONS.fr.md) (index : [`standards/README.fr.md`](./docs/standards/README.fr.md)).

- [`standards/NAMING_CONVENTIONS.fr.md`](./docs/standards/NAMING_CONVENTIONS.fr.md)
- [`standards/GIT_CONVENTIONS.fr.md`](./docs/standards/GIT_CONVENTIONS.fr.md)
- [`standards/CODE_QUALITY.fr.md`](./docs/standards/CODE_QUALITY.fr.md)
- [`standards/TESTING_CONVENTIONS.fr.md`](./docs/standards/TESTING_CONVENTIONS.fr.md)
- [`standards/API_CONVENTIONS.fr.md`](./docs/standards/API_CONVENTIONS.fr.md)
- [`standards/ACCESSIBILITY_RGAA.fr.md`](./docs/standards/ACCESSIBILITY_RGAA.fr.md) — règles d'accessibilité, audit, manques connus
- [`standards/ACCESSIBILITY_STATEMENT.fr.md`](./docs/standards/ACCESSIBILITY_STATEMENT.fr.md) — déclaration d'accessibilité (brouillon)

### Qualité et équipe

- [`quality-gate.md`](./docs/quality-gate.md) — contrôles de CI, couverture, SonarQube (en anglais)
- [`team/ONBOARDING.fr.md`](./docs/team/ONBOARDING.fr.md) — organisation de l'équipe et intégration
- [`team/WIKI.fr.md`](./docs/team/WIKI.fr.md) — publication de `docs/` sur le [wiki GitHub](https://github.com/LegacycyLaFamille/kanban-app/wiki)
- [`benchmarks/benchmarks_report.md`](./docs/benchmarks/benchmarks_report.md) — benchmarks technologiques

Les documents de `adr/`, `architecture/`, `standards/` et `team/` existent en français (`.fr.md`) et en anglais.

## Décisions importantes actuellement retenues

- React est conservé et migre progressivement vers TypeScript.
- Node.js et Express sont conservés côté backend.
- L’API reste une API REST.
- Le backend cible suit `Controller → Service → Repository`.
- Prisma est utilisé comme ORM.
- La nouvelle persistence utilise PostgreSQL.
- Les anciennes données `todo_items` ne sont pas migrées dans les projets des utilisateurs, car le legacy ne permet pas d’en déterminer le propriétaire ; elles sont conservées dans une archive en lecture seule (`LegacyTodoItem`).
- Les utilisateurs doivent être prévenus avant la mise à niveau afin de pouvoir conserver les informations nécessaires et recréer les tâches encore pertinentes après authentification.
- RabbitMQ est utilisé pour le workflow event-driven.
- Les droits sur un projet sont décidés à un seul endroit (`ProjectAccessGuard`) : propriétaire, rôles EDITOR et VIEWER.
- La landing page est servie sur `/`, l'application legacy sur `/legacy` (ADR-010, proposé).
- Docker, GitHub Actions, ESLint, tests, couverture et analyse de qualité font partie de la modernisation.
