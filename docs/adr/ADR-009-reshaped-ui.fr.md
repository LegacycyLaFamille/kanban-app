# ADR-009 — Reshaped comme fondation UI frontend

## Statut

Accepted

## Date

2026-09-14

## Contexte

Le nouveau frontend a besoin de composants UI accessibles et cohérents pour les formulaires, boutons, cards, modales, navigation, feedback et layouts.

Le projet dispose d'une période de livraison courte et doit concentrer l'effort de développement sur les fonctionnalités métier Kanban plutôt que sur la création et la maintenance d'un design system complet maison.

Le frontend legacy utilise actuellement React-Bootstrap, mais cette dépendance appartient à l'UI legacy temporaire et ne doit pas définir le frontend cible.

## Décision

Reshaped sera utilisé comme fondation de composants UI et de design system pour les nouvelles fonctionnalités frontend.

Le nouveau code peut utiliser directement les composants et tokens Reshaped.

Les composants spécifiques à l'application peuvent être construits au-dessus de Reshaped lorsque cela est utile.

React-Bootstrap reste uniquement là où il est nécessaire pour le frontend legacy temporaire et doit disparaître lorsque l'UI legacy sera supprimée.

## Alternatives étudiées

### Construire une bibliothèque de composants maison

Rejetée car cela consommerait beaucoup de temps sur une infrastructure à faible valeur métier pendant un projet court.

### Continuer React-Bootstrap pour le frontend cible

Rejeté car il est principalement conservé pour compatibilité legacy et ne représente pas la direction visuelle cible.

### Utiliser une bibliothèque plus importante comme MUI

Étudié, mais Reshaped a été retenu pour ses primitives orientées design system, son support TypeScript, son attention à l'accessibilité, son theming et son adéquation avec la direction visuelle choisie.

## Conséquences

### Positives

- Livraison plus rapide d'interfaces cohérentes.
- Composants accessibles disponibles par défaut.
- Tokens et theming partagés.
- Moins de CSS custom pour les contrôles UI communs.
- Séparation claire entre l'UI Bootstrap legacy et l'UI cible.

### Négatives / Compromis

- Ajoute une dépendance UI tierce.
- L'équipe doit suivre les APIs Reshaped et son cycle d'évolution.
- Les interactions très personnalisées peuvent toujours nécessiter du style spécifique à l'application.

## Notes d'implémentation

Ne pas wrapper chaque primitive Reshaped dans un composant custom sans vraie raison applicative.

Utiliser `shared/components/` pour les composants réutilisables propres à l'application, pas pour recopier l'API Reshaped.

Pinner la version de la dépendance pendant le projet afin de réduire les changements inattendus.

## Documentation associée

- `docs/architecture/FRONTEND_MIGRATION.fr.md`
- `docs/standards/DEVELOPMENT_CONVENTIONS.fr.md`

## Remplace

Aucun

## Remplacé par

Aucun
