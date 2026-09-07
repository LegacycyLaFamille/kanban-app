# Migration du frontend legacy vers la nouvelle architecture

## 1. Objectif

L’objectif n’est pas de réécrire complètement le frontend existant, mais de le moderniser progressivement tout en conservant l’application fonctionnelle pendant la migration.

Le frontend actuel repose sur React et JavaScript. La cible conserve React, mais introduit progressivement :

- TypeScript ;
- une architecture orientée fonctionnalités ;
- une séparation claire entre pages, composants, logique métier et appels API ;
- une communication centralisée avec l’API REST ;
- des tests automatisés et des contrôles qualité.

L’approche retenue est donc une migration incrémentale, adaptée à un projet legacy d’entreprise.

## 2. Architecture cible

```text
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── providers/
│   │   └── layouts/
│   ├── features/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── kanban/
│   │   ├── users/
│   │   └── notifications/
│   ├── shared/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── constants/
│   │   └── types/
│   ├── styles/
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

- `app/` : initialisation, routing, providers et layouts globaux.
- `features/` : fonctionnalités métier organisées par domaine.
- `shared/` : éléments réutilisables indépendants du métier.
- `api/` : appels REST propres à chaque fonctionnalité.
- `hooks/` : logique d’orchestration frontend.
- `components/` : composants visuels.
- `pages/` : écrans routables.
- `schemas/` : validation des données.
- `types/` : types TypeScript liés au domaine.

## 3. Principe de migration

```text
Legacy React / JavaScript
        ↓
Introduction de TypeScript
        ↓
Création du nouveau squelette frontend
        ↓
Migration fonctionnalité par fonctionnalité
        ↓
Suppression progressive du code legacy remplacé
```

Le projet doit rester exécutable après chaque étape importante.

## 4. Étapes de migration

### Étape 1 — Stabiliser l’existant
- identifier les comportements actuels ;
- ajouter ou conserver les tests nécessaires ;
- configurer ESLint et les contrôles qualité ;
- vérifier la CI ;
- documenter les composants legacy concernés.

### Étape 2 — Introduire TypeScript progressivement
Les fichiers JavaScript peuvent temporairement coexister avec les fichiers TypeScript.

Le nouveau code est écrit en TypeScript autant que possible. Les composants legacy sont migrés lorsqu’ils doivent être modifiés ou remplacés.

### Étape 3 — Mettre en place le squelette cible
Créer les répertoires :

```text
app/
features/
shared/
```

Les responsabilités sont déplacées progressivement, sans refactor massif inutile.

### Étape 4 — Centraliser les appels API

```text
Page
 ↓
Composant métier
 ↓
Hook
 ↓
API de la feature
 ↓
Client HTTP partagé
 ↓
API REST backend
```

Exemple :

```text
KanbanPage
   ↓
KanbanBoard
   ↓
useTasks()
   ↓
tasks.api.ts
   ↓
httpClient.ts
   ↓
GET /api/projects/:projectId/tasks
```

### Étape 5 — Migrer les fonctionnalités métier

Ordre recommandé :

1. Authentification ;
2. Projets ;
3. Tâches ;
4. Kanban ;
5. Utilisateurs ;
6. Notifications.

Chaque fonctionnalité est migrée indépendamment afin de limiter les risques et la taille des Pull Requests.

### Étape 6 — Supprimer le legacy remplacé
Une partie legacy n’est supprimée que lorsque :

- son remplacement est fonctionnel ;
- les tests passent ;
- la CI est valide ;
- la Pull Request est approuvée ;
- aucune dépendance active ne repose encore dessus.

## 5. Gestion de l’état

L’état global reste limité aux données réellement globales :

- utilisateur authentifié ;
- état de session ;
- notifications globales.

Les données propres à une fonctionnalité restent autant que possible dans cette fonctionnalité.

## 6. Règles de migration

- pas de réécriture complète du frontend ;
- petites Pull Requests ciblées ;
- application fonctionnelle après chaque étape ;
- TypeScript utilisé pour tout nouveau code lorsque possible ;
- tests ajoutés ou mis à jour avec la fonctionnalité ;
- aucune suppression du legacy avant validation du remplacement ;
- respect des conventions de nommage, Git, tests et qualité.

## 7. Résultat attendu

À la fin de la migration, le frontend doit être :

- structuré par fonctionnalités ;
- majoritairement ou entièrement en TypeScript ;
- connecté à l’API REST via une couche dédiée ;
- testable ;
- maintenable ;
- évolutif ;
- débarrassé progressivement du code legacy devenu inutile.

La migration doit démontrer une modernisation maîtrisée du système existant, et non la création d’une nouvelle application indépendante.
