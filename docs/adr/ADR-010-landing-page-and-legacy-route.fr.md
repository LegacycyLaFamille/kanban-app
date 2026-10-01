# ADR-010 — Landing page sur `/`, application legacy déplacée sur `/legacy`

## Statut

Proposed

## Date

2026-10-01

## Contexte

Jusqu'ici, la route racine `/` affichait l'ancienne TodoList
(`frontend/src/app/legacy/LegacyApp.jsx`). Un visiteur qui ouvrait
l'application arrivait donc sur le legacy, sans présentation du produit
Kanban et sans moyen direct de créer un compte ou de se connecter : ces
actions n'existaient que sur `/login` et `/register`.

L'[ADR-001](ADR-001-incremental-legacy-modernization.fr.md) impose que
l'application legacy reste opérationnelle tant que son remplaçant n'est pas
validé : elle ne peut donc pas simplement être supprimée.

## Décision

- `/` affiche une landing page (`frontend/src/features/landing/`) :
  présentation du produit, et formulaires de connexion / d'inscription dans
  la page.
- La TodoList legacy reste disponible, inchangée, sur **`/legacy`**.
  L'entrée « Legacy » de la sidebar admin y mène.
- Les formulaires de connexion et d'inscription sont des composants partagés
  (`features/auth/components/LoginForm.tsx`, `RegisterForm.tsx`), utilisés
  par la landing page et par les pages `/login` / `/register`.

## Alternatives envisagées

### Garder le legacy sur `/` et mettre la landing page ailleurs

Rejeté : la première chose que verrait chaque visiteur resterait le legacy,
et les liens vers le produit demanderaient une URL d'entrée à part.

### Supprimer l'application legacy

Rejeté : contraire à l'ADR-001, son remplaçant n'est pas encore validé par
toutes les parties prenantes.

## Conséquences

### Positives

- Les nouveaux visiteurs découvrent le produit et créent un compte au même
  endroit.
- Le legacy reste accessible et intact.
- Pas de logique de formulaire dupliquée entre la landing page et les pages
  d'authentification.

### Négatives / compromis

- Les favoris et liens vers `/` qui visaient le legacy arrivent désormais
  sur la landing page. Les utilisateurs du legacy doivent être informés de
  l'adresse `/legacy`.
- La landing page est une nouvelle page animée à maintenir accessible (voir
  [ACCESSIBILITY_RGAA.fr.md §3.9](../standards/ACCESSIBILITY_RGAA.fr.md)).

## Notes d'implémentation

- Routage : `frontend/src/app/router.tsx`.
- Comportement, accessibilité et animations :
  [docs/frontend/FEATURES.md](../frontend/FEATURES.md#landing-page-).
- Le jour où le legacy est supprimé, retirer la route `/legacy` et l'entrée
  « Legacy » de la sidebar admin en même temps que `frontend/src/app/legacy/`.

## Documentation liée

- [ADR-001 — Modernisation incrémentale du legacy](ADR-001-incremental-legacy-modernization.fr.md)
- [docs/frontend/FEATURES.md](../frontend/FEATURES.md)

## Remplace

Aucun

## Remplacé par

Aucun
