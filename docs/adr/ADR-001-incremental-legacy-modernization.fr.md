# ADR-001 — Modernisation incrémentale du legacy

## Statut

Accepted

## Date

2026-09-14

## Contexte

Le projet part d'une application TodoList existante contenant de la dette technique et ne fournissant ni l'architecture ni les fonctionnalités nécessaires au produit Kanban cible.

L'application doit être comprise avant d'être modifiée, et son comportement existant doit rester disponible pendant l'introduction de la nouvelle architecture.

Une réécriture complète supprimerait la baseline fonctionnelle existante, créerait un risque d'intégration important et rendrait plus difficile la démonstration d'une modernisation contrôlée d'un système legacy.

## Décision

Le projet utilisera une stratégie de modernisation incrémentale du legacy.

Le code legacy est isolé derrière des frontières explicites puis remplacé progressivement.

La séquence de migration est :

1. Auditer et comprendre le système actuel.
2. Préserver une baseline legacy fonctionnelle.
3. Ajouter des tests de caractérisation et des garde-fous qualité.
4. Isoler le code legacy frontend et backend.
5. Introduire l'architecture cible autour du legacy.
6. Remplacer progressivement les fonctionnalités.
7. Supprimer le legacy uniquement lorsque son remplacement est fonctionnel et validé.

Les principales zones legacy actuelles sont :

- `frontend/src/app/legacy/`
- `backend/src/legacy/`

## Alternatives étudiées

### Réécriture complète

Rejetée car elle introduirait un risque de livraison et de régression trop important pour un projet court et supprimerait la baseline fonctionnelle existante.

### Conserver l'architecture legacy sans modification

Rejetée car l'application actuelle ne fournit pas la maintenabilité, la sécurité, le modèle métier, les tests ou les fondations de livraison nécessaires au produit cible.

## Conséquences

### Positives

- Le comportement existant reste disponible pendant la migration.
- Les changements peuvent être livrés via des Pull Requests plus petites.
- Le risque de régression est réduit.
- Le legacy est clairement séparé du nouveau code.
- Le chemin de migration reste démontrable et traçable.

### Négatives / Compromis

- Les architectures legacy et cible coexistent temporairement.
- Des adaptateurs et configurations de compatibilité temporaires sont nécessaires.
- Le repository est temporairement plus complexe pendant la transition.

## Notes d'implémentation

Ne pas refactorer du code legacy uniquement parce qu'il est ancien.

Un composant legacy ne peut être supprimé que lorsque son remplacement existe, fonctionne et qu'aucune dépendance active n'utilise encore l'ancienne implémentation.

## Documentation associée

- `docs/audit/`
- `docs/architecture/FRONTEND_MIGRATION.fr.md`
- `docs/architecture/BACKEND_MIGRATION.fr.md`

## Remplace

Aucun

## Remplacé par

Aucun
