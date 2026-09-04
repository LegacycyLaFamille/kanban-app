# Conventions de développement

## 1. Objectif

Ce document est le point d’entrée des conventions de développement et constitue la référence concrète pour **S1-04 — Define development conventions**.

Le projet suit une stratégie de modernisation incrémentale du legacy et non une réécriture complète.

---

## 2. Direction architecturale

### Frontend

```text
React + JavaScript legacy
        ↓ migration progressive
React + TypeScript
Architecture orientée fonctionnalités
```

Stratégie détaillée :

- [`../architecture/FRONTEND_MIGRATION.md`](../architecture/FRONTEND_MIGRATION.md)
- [`../architecture/FRONTEND_MIGRATION.fr.md`](../architecture/FRONTEND_MIGRATION.fr.md)

### Backend

```text
Node.js + Express + JavaScript legacy
        ↓ migration progressive
Node.js + Express + TypeScript
Controllers → Services → Repositories → Prisma → PostgreSQL
                           └────────────→ Events RabbitMQ
```

Stratégie détaillée :

- [`../architecture/BACKEND_MIGRATION.md`](../architecture/BACKEND_MIGRATION.md)
- [`../architecture/BACKEND_MIGRATION.fr.md`](../architecture/BACKEND_MIGRATION.fr.md)

L’application cible reste un **monolithe modulaire**.

---

## 3. Standards obligatoires

Tous les contributeurs doivent respecter :

1. [Conventions de nommage](NAMING_CONVENTIONS.fr.md)
2. [Conventions Git](GIT_CONVENTIONS.fr.md)
3. [Standards de qualité du code](CODE_QUALITY.fr.md)
4. [Conventions de tests](TESTING_CONVENTIONS.fr.md)
5. [Conventions API et backend](API_CONVENTIONS.fr.md)

---

## 4. Couverture de S1-04

S1-04 est satisfaite lorsque l’équipe a documenté et validé :

- le nommage du code et des fichiers ;
- l’organisation frontend orientée fonctionnalités ;
- les responsabilités des couches backend ;
- la migration progressive JavaScript → TypeScript ;
- les conventions API REST ;
- les conventions de persistence Prisma + PostgreSQL ;
- les conventions d’événements/RabbitMQ ;
- les branches Git et Conventional Commits ;
- les règles de Pull Request et review ;
- la stratégie de merge ;
- le lint et le contrôle des types ;
- la stratégie de tests et les tests de caractérisation ;
- les objectifs de couverture ;
- les exigences CI/qualité ;
- l’alignement avec la Definition of Done.

---

## 5. Règles de migration

- Ne pas réécrire l’application en une seule opération.
- Conserver une application exécutable pendant les étapes importantes.
- Préférer des Pull Requests petites et ciblées.
- Protéger les comportements legacy par des tests de caractérisation avant les refactors risqués.
- Le nouveau code doit utiliser l’architecture cible.
- Le legacy est migré lorsqu’il est modifié ou remplacé.
- Ne pas supprimer le legacy avant validation de son remplacement.
- Ne pas inventer de propriétaire aux données métier legacy.

---

## 6. Application

Ces conventions sont appliquées grâce à :

- la code review ;
- la protection de branche GitHub ;
- ESLint ;
- les contrôles TypeScript ;
- les tests automatisés ;
- la couverture ;
- l’analyse statique de qualité ;
- GitHub Actions.

Tout écart volontaire doit être justifié et documenté.
