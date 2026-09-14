# ADR-006 — PostgreSQL et Prisma pour la persistence cible

## Statut

Accepted

## Date

2026-09-14

## Contexte

L'application legacy utilise SQLite ou MySQL avec un modèle `todo_items` minimal.

Le domaine cible introduit utilisateurs, authentification, projets, tâches, membres de projet, ownership, priorités, deadlines, notifications et relations nécessitant un nouveau schéma relationnel.

La couche de persistence est déjà en cours de reconstruction. Conserver le moteur de base legacy créerait une seconde migration future sans réel bénéfice à court terme.

## Décision

La stack de persistence cible sera :

`Repository -> Prisma -> PostgreSQL`

PostgreSQL devient la base relationnelle cible.

Prisma est utilisé comme ORM et mécanisme de migration derrière les interfaces de repository.

SQLite/MySQL reste une partie du point de départ legacy audité mais n'est pas l'architecture de persistence cible.

## Alternatives étudiées

### Conserver MySQL comme base cible

Rejeté car la couche de persistence et le schéma sont déjà reconstruits, ce qui constitue la bonne frontière de migration pour passer à PostgreSQL plutôt que prévoir une nouvelle migration de moteur plus tard.

### Conserver SQLite

Rejeté car SQLite n'est pas la persistence de production partagée visée pour l'application multi-utilisateur cible.

### SQL direct sans ORM

Rejeté car Prisma fournit gestion du schéma, migrations, accès typé et frontière de persistence cohérente pour le projet.

## Conséquences

### Positives

- Base relationnelle robuste adaptée au domaine cible.
- Migrations de schéma versionnées.
- Accès aux données typé.
- Les repositories isolent l'application des détails de persistence.
- Évite une seconde migration de moteur plus tard.

### Négatives / Compromis

- Nécessite PostgreSQL en développement, tests et déploiement.
- L'équipe doit maîtriser les migrations Prisma et le comportement PostgreSQL.
- La persistence legacy ne peut pas simplement être réutilisée telle quelle.

## Notes d'implémentation

Les modules applicatifs doivent dépendre d'abstractions de repository plutôt que d'accéder directement à Prisma depuis les controllers.

Une base de test dédiée doit être utilisée pour les tests d'intégration.

## Documentation associée

- `docs/architecture/BACKEND_MIGRATION.fr.md`
- `docs/standards/TESTING_CONVENTIONS.fr.md`
- `docs/standards/NAMING_CONVENTIONS.fr.md`

## Remplace

Aucun

## Remplacé par

Aucun
