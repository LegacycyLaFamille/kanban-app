# ADR-004 — Architecture frontend orientée fonctionnalités

## Statut

Accepted

## Date

2026-09-14

## Contexte

Le frontend cible contient plusieurs capacités métier indépendantes comme l'authentification, les projets, les tâches, le Kanban, les utilisateurs et les notifications.

Une structure organisée uniquement par type technique (`components/`, `hooks/`, `services/`) mélangerait des domaines sans rapport à mesure que l'application grandit.

## Décision

Le frontend utilisera une architecture orientée fonctionnalités.

Les responsabilités principales de `src/` sont :

- `app/` : shell applicatif, routing, providers, layouts et frontière legacy temporaire
- `features/` : fonctionnalités métier
- `shared/` : éléments techniques ou UI réutilisables ne dépendant pas d'une seule feature
- `styles/` : styles globaux et fondations visuelles globales

Chaque feature peut contenir ses propres dossiers :

- `api/`
- `components/`
- `hooks/`
- `pages/`
- `schemas/`
- `types/`

Les CSS Modules spécifiques à un composant doivent être placés à côté de ce composant.

## Alternatives étudiées

### Dossiers globaux par type technique

Rejetés car les composants, hooks, APIs et types de domaines différents se retrouveraient mélangés à mesure que le produit grandit.

### Un seul gros dossier applicatif

Rejeté car il rendrait les responsabilités et frontières de dépendances moins claires.

## Conséquences

### Positives

- La responsabilité métier est facile à comprendre.
- Les features peuvent évoluer indépendamment.
- Les fichiers liés sont regroupés.
- Le remplacement progressif du legacy est plus simple.
- Le code partagé reste volontairement limité.

### Négatives / Compromis

- Une certaine structure se répète entre les features.
- Les développeurs doivent décider avec attention si un élément appartient à une feature ou à `shared/`.

## Notes d'implémentation

Du code ne doit aller dans `shared/` que s'il est réellement réutilisable entre plusieurs features et qu'il n'appartient pas clairement à un domaine.

Une feature ne doit pas dépendre des détails internes d'implémentation d'une autre feature.

## Documentation associée

- `docs/architecture/FRONTEND_MIGRATION.fr.md`
- `docs/standards/NAMING_CONVENTIONS.fr.md`

## Remplace

Aucun

## Remplacé par

Aucun
