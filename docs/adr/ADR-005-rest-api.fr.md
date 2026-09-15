# ADR-005 — API REST pour la communication frontend/backend

## Statut

Accepted

## Date

2026-09-14

## Contexte

Le frontend et le backend ont besoin d'un contrat applicatif stable pour l'authentification, les projets, les tâches, les utilisateurs, les notifications et les opérations Kanban.

L'application existante utilise déjà des endpoints HTTP, et l'architecture cible nécessite des règles claires d'autorisation, de validation, de testabilité et de documentation.

## Décision

La communication frontend/backend utilisera une API REST sur HTTP avec des payloads JSON.

Les conventions incluent :

- ressources en minuscules et au pluriel
- paramètres de chemin en camelCase
- propriétés JSON en camelCase
- codes de statut HTTP standards
- structures d'erreur cohérentes
- documentation OpenAPI lorsqu'elle sera introduite

Exemples :

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `POST /api/projects/:projectId/tasks`
- `PATCH /api/tasks/:taskId`

## Alternatives étudiées

### GraphQL

Rejeté car le projet n'a actuellement pas besoin de requêtes flexibles définies par le client ni de la complexité supplémentaire liée au schéma et au runtime.

### Accès direct à la base depuis le frontend

Rejeté car cela contournerait l'autorisation, la validation, les règles métier et les frontières de services.

## Conséquences

### Positives

- Contrat simple et familier.
- Facile à tester avec des outils HTTP standards.
- Mapping clair vers les ressources métier.
- Compatible avec OpenAPI.
- Frontend et backend restent faiblement couplés.

### Négatives / Compromis

- Certains écrans complexes peuvent nécessiter plusieurs requêtes.
- La compatibilité et l'évolution de l'API doivent être gérées dans le temps.

## Notes d'implémentation

La logique métier doit rester dans les services backend, pas dans les controllers ni dans le frontend.

Les erreurs brutes Prisma, base de données ou stack traces ne doivent jamais être exposées aux clients.

## Documentation associée

- `docs/standards/API_CONVENTIONS.fr.md`
- `docs/architecture/BACKEND_MIGRATION.fr.md`

## Remplace

Aucun

## Remplacé par

Aucun
