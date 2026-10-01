# ADR-011 — Retrait de l'application TodoList legacy

## Statut

Proposed

## Date

2026-10-02

## Contexte

L'[ADR-001](ADR-001-incremental-legacy-modernization.fr.md) gardait la
TodoList legacy en service jusqu'à ce que l'application Kanban la remplace,
et l'[ADR-010](ADR-010-landing-page-and-legacy-route.fr.md) l'avait
déplacée sur `/legacy`. L'application Kanban couvre désormais tout ce que
faisait la TodoList, et bien plus (tâches, statuts, comptes, projets) ;
elle est testée, auditée et déployée.

Garder l'application legacy était devenu un coût sans utilisateur :

- une API sans authentification (`/api/legacy/items`) ouverte à quiconque
  atteint le backend (relevée dans l'[audit des autorisations](../audit/AUTHORIZATION_AUDIT.fr.md)) ;
- du code CommonJS exclu du lint, de la couverture et de SonarQube ;
- deux dépendances frontend (`bootstrap`, `react-bootstrap`) et un plugin
  ESLint utilisés par rien d'autre ;
- la route `/legacy` avait déjà disparu du router, mais la sidebar admin y
  menait encore (lien mort).

## Décision

Retirer l'application TodoList legacy : `frontend/src/app/legacy/`,
`backend/src/legacy/`, l'API `/api/legacy`, les proxys `/items` (nginx et
Vite), l'entrée « Legacy » de la sidebar admin, son smoke test en CI, ses
exclusions de lint, de couverture et de SonarQube, et ses dépendances.

**Garder les données legacy et leur outil de migration** jusqu'à ce que
chaque stack déployée ait été archivée :

- `backend/src/scripts/migrate-legacy-data.ts` (et
  `scripts/migrate-legacy-data.sh`), la table d'archive `LegacyTodoItem`
  ([ADR-007](ADR-007-no-legacy-data-migration.fr.md)), et les pilotes
  `sqlite3` / `mysql2` dont il a besoin ;
- le volume `backend-data` et `SQLITE_DB_LOCATION=/data/todo.db`, qui
  contiennent encore les données de la TodoList sur les stacks déployées.

## Alternatives envisagées

### Tout supprimer, données et outil compris

Rejeté pour l'instant : si les données d'une stack n'ont pas encore été
archivées, supprimer le volume ou le script les perdrait définitivement.

### Garder l'application legacy sur `/legacy`

Rejeté : plus personne n'en a besoin, et elle maintient une API sans
authentification et du code non contrôlé dans le produit.

## Conséquences

### Positives

- Plus aucune route sans authentification ; tout le code source est linté,
  mesuré et analysé par SonarQube.
- Bundle frontend et arbre de dépendances plus légers.

### Négatives / compromis

- La TodoList n'est plus accessible : ses données ne sont conservées que
  dans l'archive `LegacyTodoItem` (après migration) et dans le volume.
- L'outil de migration et le volume `backend-data` restent jusqu'au suivi
  ci-dessous.

## Notes d'implémentation

Sur chaque stack déployée (`~/kanban-dev`, `~/kanban-main`), lancer
`./scripts/migrate-legacy-data.sh --dry-run`, puis
`./scripts/migrate-legacy-data.sh` ([LEGACY_DATA_MIGRATION.md](../backend/LEGACY_DATA_MIGRATION.md)).
Une fois toutes les stacks archivées, un suivi pourra retirer le script,
les deux pilotes, `SQLITE_DB_LOCATION` et le volume `backend-data`.

## Documentation liée

- [ADR-001 — Modernisation incrémentale du legacy](ADR-001-incremental-legacy-modernization.fr.md)
- [ADR-007 — Pas de migration automatique des données legacy](ADR-007-no-legacy-data-migration.fr.md)
- [ADR-010 — Landing page sur `/`, application legacy déplacée sur `/legacy`](ADR-010-landing-page-and-legacy-route.fr.md)

## Remplace

ADR-010, pour la route `/legacy` uniquement (la landing page sur `/` reste).

## Remplacé par

Aucun
