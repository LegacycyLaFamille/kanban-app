# ADR-007 — Ne pas migrer automatiquement les anciennes Todo

## Statut

Accepted

## Date

2026-09-14

## Contexte

Le modèle legacy `todo_items` ne contient aucune relation vers un utilisateur, un propriétaire, un projet, un membre ou une règle d'autorisation.

L'application cible introduit des utilisateurs authentifiés et un modèle d'ownership `User -> Project -> Task`.

Attribuer automatiquement les anciennes Todo aux nouveaux utilisateurs nécessiterait d'inventer une information de propriété qui n'existe pas dans les données legacy.

Exposer toutes les anciennes Todo à tous les utilisateurs entrerait en conflit avec le modèle d'autorisation cible et créerait un risque inutile de confidentialité et de divulgation.

## Décision

Les anciennes données métier Todo ne seront pas automatiquement migrées vers le nouveau domaine Project/Task.

Le nouveau schéma de base sera bien créé et versionné via les migrations Prisma. Cet ADR concerne les anciennes données métier, pas la création technique du nouveau schéma.

Avant la finalisation de la migration, les utilisateurs doivent être informés que les anciennes Todo ne peuvent pas être associées de manière fiable à des comptes et qu'ils doivent conserver les informations encore utiles.

Les tâches toujours pertinentes pourront ensuite être recréées dans le modèle authentifié Project/Task.

## Alternatives étudiées

### Attribuer toutes les anciennes tâches à un utilisateur par défaut

Rejeté car l'ownership serait inventé et potentiellement incorrect.

### Exposer les anciennes tâches à tous les utilisateurs authentifiés

Rejeté car cela contredirait le modèle d'autorisation cible et pourrait divulguer des données à des utilisateurs non autorisés.

### Tenter une association heuristique des propriétaires

Rejeté car le modèle legacy ne contient pas assez d'informations fiables pour permettre une association de confiance.

## Conséquences

### Positives

- Aucun ownership n'est inventé.
- Les règles d'autorisation cibles restent cohérentes.
- Réduction du risque inutile de confidentialité et de divulgation.
- Le nouveau modèle métier reste propre.

### Négatives / Compromis

- La continuité historique des Todo est volontairement rompue.
- Les utilisateurs peuvent devoir recréer manuellement les tâches encore pertinentes.
- Une communication avant migration est nécessaire.

## Notes d'implémentation

Ne pas affirmer que la réglementation sur la vie privée interdit automatiquement la migration. La décision repose sur l'absence d'informations fiables d'ownership et d'autorisation ainsi que sur le risque de confidentialité et de sécurité qui en découle.

La décision doit être communiquée clairement avant que les anciennes données ne deviennent indisponibles.

## Documentation associée

- `docs/audit/`
- `docs/architecture/BACKEND_MIGRATION.fr.md`

## Remplace

Aucun

## Remplacé par

Aucun
