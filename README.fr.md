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

## Organisation des documents

### Audit

- [`audit/LEGACY_AUDIT.fr.md`](./docs/audit/LEGACY_AUDIT.fr.md)  
  État des lieux technique complet du repository legacy : stack, versions, architecture, dette technique, sécurité, tests, CI/CD, Docker, persistence et recommandations.

### Architecture et stratégie de migration

- [`architecture/FRONTEND_MIGRATION.md`](./docs/architecture/FRONTEND_MIGRATION.md)
- [`architecture/FRONTEND_MIGRATION.fr.md`](./docs/architecture/FRONTEND_MIGRATION.fr.md)
- [`architecture/BACKEND_MIGRATION.md`](./docs/architecture/BACKEND_MIGRATION.md)
- [`architecture/BACKEND_MIGRATION.fr.md`](./docs/architecture/BACKEND_MIGRATION.fr.md)

Ces documents expliquent comment passer progressivement du legacy vers l’architecture cible.

### Standards de développement

Le point d’entrée principal est :

- [`standards/DEVELOPMENT_CONVENTIONS.md`](./docs/standards/DEVELOPMENT_CONVENTIONS.md)
- [`standards/DEVELOPMENT_CONVENTIONS.fr.md`](./docs/standards/DEVELOPMENT_CONVENTIONS.fr.md)

Standards détaillés :

- [`standards/NAMING_CONVENTIONS.md`](./docs/standards/NAMING_CONVENTIONS.md)
- [`standards/NAMING_CONVENTIONS.fr.md`](./docs/standards/NAMING_CONVENTIONS.fr.md)
- [`standards/GIT_CONVENTIONS.md`](./docs/standards/GIT_CONVENTIONS.md)
- [`standards/GIT_CONVENTIONS.fr.md`](./docs/standards/GIT_CONVENTIONS.fr.md)
- [`standards/CODE_QUALITY.md`](./docs/standards/CODE_QUALITY.md)
- [`standards/CODE_QUALITY.fr.md`](./docs/standards/CODE_QUALITY.fr.md)
- [`standards/TESTING_CONVENTIONS.md`](./docs/standards/TESTING_CONVENTIONS.md)
- [`standards/TESTING_CONVENTIONS.fr.md`](./docs/standards/TESTING_CONVENTIONS.fr.md)
- [`standards/API_CONVENTIONS.md`](./docs/standards/API_CONVENTIONS.md)
- [`standards/API_CONVENTIONS.fr.md`](./docs/standards/API_CONVENTIONS.fr.md)

Le dossier `standards/` possède également son propre README récapitulatif.

## Décisions importantes actuellement retenues

- React est conservé et migre progressivement vers TypeScript.
- Node.js et Express sont conservés côté backend.
- L’API reste une API REST.
- Le backend cible suit `Controller → Service → Repository`.
- Prisma est utilisé comme ORM.
- La nouvelle persistence utilise PostgreSQL.
- Les anciennes données `todo_items` ne sont pas automatiquement migrées, car le legacy ne permet pas d’en déterminer le propriétaire.
- Les utilisateurs doivent être prévenus avant la mise à niveau afin de pouvoir conserver les informations nécessaires et recréer les tâches encore pertinentes après authentification.
- RabbitMQ est utilisé pour le workflow event-driven.
- Docker, GitHub Actions, ESLint, tests, couverture et analyse de qualité font partie de la modernisation.
