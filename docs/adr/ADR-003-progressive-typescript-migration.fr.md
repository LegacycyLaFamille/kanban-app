# ADR-003 — Migration progressive de JavaScript vers TypeScript

## Statut

Accepted

## Date

2026-09-14

## Contexte

L'application existante contient du JavaScript et du JSX, tandis que l'architecture cible utilise TypeScript.

Convertir toute l'application d'un seul coup mélangerait changements d'architecture, migration de langage et développement fonctionnel dans de grandes Pull Requests.

## Décision

JavaScript et TypeScript coexisteront temporairement.

Le nouveau code applicatif doit être écrit en TypeScript.

Le JavaScript/JSX legacy peut rester inchangé tant qu'il est encore nécessaire.

La migration s'effectue progressivement lorsqu'une zone legacy est remplacée ou fortement modifiée.

Les extensions suivent :

- `.ts` pour TypeScript sans JSX
- `.tsx` pour TypeScript contenant du JSX
- `.js` / `.jsx` uniquement pour le legacy non encore migré

Des options temporaires du compilateur peuvent autoriser JavaScript sans imposer immédiatement le contrôle TypeScript au code legacy.

## Alternatives étudiées

### Conversion TypeScript complète en une seule fois

Rejetée car elle créerait beaucoup de churn, de grandes Pull Requests et un risque de régression sans apporter directement de valeur produit.

### Conserver JavaScript pour tout le projet

Rejeté car TypeScript améliore les contrats, la sécurité des refactors, l'aide de l'IDE et la maintenabilité de l'application cible.

## Conséquences

### Positives

- Le risque de migration est réparti sur de plus petits changements.
- Le nouveau code bénéficie immédiatement du typage statique.
- Le legacy reste fonctionnel pendant la transition.
- Les fonctionnalités peuvent être migrées indépendamment.

### Négatives / Compromis

- JavaScript et TypeScript coexistent temporairement.
- L'outillage doit supporter les deux langages pendant la migration.
- Certaines zones legacy ont des garanties de typage plus faibles jusqu'à leur remplacement.

## Notes d'implémentation

Ne pas ajouter inutilement du travail de typage à du code prévu pour être supprimé.

La rigueur TypeScript peut être renforcée progressivement au fur et à mesure de la disparition du legacy.

## Documentation associée

- `docs/architecture/FRONTEND_MIGRATION.fr.md`
- `docs/architecture/BACKEND_MIGRATION.fr.md`
- `docs/standards/DEVELOPMENT_CONVENTIONS.fr.md`

## Remplace

Aucun

## Remplacé par

Aucun
