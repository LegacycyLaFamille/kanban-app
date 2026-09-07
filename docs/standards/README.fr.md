# Standards du projet

Ce dossier contient les standards d’ingénierie utilisés par le projet de refonte Kanban.

## Point d’entrée

- [Conventions de développement](DEVELOPMENT_CONVENTIONS.fr.md)

## Standards détaillés

- [Conventions de nommage](NAMING_CONVENTIONS.fr.md)
- [Conventions Git](GIT_CONVENTIONS.fr.md)
- [Standards de qualité du code](CODE_QUALITY.fr.md)
- [Conventions de tests](TESTING_CONVENTIONS.fr.md)
- [Conventions API et backend](API_CONVENTIONS.fr.md)

## Architecture et migration

- [Migration frontend](../architecture/FRONTEND_MIGRATION.fr.md)
- [Migration backend](../architecture/BACKEND_MIGRATION.fr.md)

Les versions anglaises utilisent les fichiers sans suffixe `.fr.md`.

Le projet suit une stratégie de modernisation incrémentale : conserver l’application existante, mettre en place les garde-fous, migrer progressivement vers TypeScript et l’architecture modulaire cible, puis introduire le domaine Kanban et les infrastructures nécessaires.


## Persistence cible actuelle

L’application legacy auditée utilise une persistence SQLite / MySQL. L’architecture cible migre volontairement la nouvelle couche de données vers **Prisma + PostgreSQL**. Les anciens tickets legacy ne sont pas importés automatiquement car leur propriétaire ne peut pas être déterminé de manière fiable.
