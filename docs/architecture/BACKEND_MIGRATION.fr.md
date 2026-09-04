# Migration du backend legacy vers l’architecture cible

## 1. Objectif

La migration du backend doit moderniser progressivement l’application existante sans repartir d’une nouvelle codebase indépendante.

Le principe retenu est une **migration incrémentale du legacy**, comparable à la modernisation d’une application d’entreprise déjà en production :

```text
Backend legacy
Node.js + Express + JavaScript
Persistence directe SQLite / MySQL
        ↓
Sécurisation et tests
        ↓
Migration progressive vers TypeScript
        ↓
Séparation Controller / Service / Repository
        ↓
Introduction de Prisma
        ↓
Modernisation de la base vers PostgreSQL
        ↓
Évolution du domaine Todo → Project / Task
        ↓
Authentification et gestion des utilisateurs
        ↓
Event-driven avec RabbitMQ
```

L’application doit rester fonctionnelle pendant les étapes de migration importantes.

---

## 2. Constat issu de l’audit

Le modèle de données legacy actuel est extrêmement limité.

La table principale est structurée autour de trois informations :

```text
todo_items
├── id
├── name
└── completed
```

Aucune notion d’utilisateur, de propriétaire ou de rattachement à un compte n’existe dans le modèle actuel.

Il n’existe donc aucun lien permettant de déterminer de manière fiable :

```text
Todo existant
      ↓
Quel utilisateur en est propriétaire ?
```

Cette limitation est importante car l’architecture cible introduit au contraire une gestion authentifiée et cloisonnée des données :

```text
User
 └── Projects
      └── Tasks
```

Une tâche devra donc toujours être rattachée à un utilisateur ou à un projet auquel cet utilisateur est autorisé à accéder.

Ce point est considéré comme une **limitation fonctionnelle et de gouvernance des données identifiée pendant l’audit legacy**.

---

## 3. Décision concernant les données legacy

### 3.1. Les anciens tickets ne seront pas migrés automatiquement

La décision retenue est de **ne pas importer les éléments `todo_items` existants dans le nouveau modèle Kanban**.

Cette décision ne signifie pas que la nouvelle base ne sera pas structurée ou migrée techniquement.

Le schéma cible sera bien créé et versionné, notamment avec Prisma.

La décision concerne uniquement les **données métier legacy dont la propriété ne peut pas être déterminée**.

```text
Ancienne base
todo_items
   │
   │ pas de migration automatique des données
   ✕
   │
   ▼
Nouvelle structure
Users → Projects → Tasks
```

### 3.2. Modernisation du moteur de base de données

Puisque le modèle de données cible doit être reconstruit et que les données métier legacy ne peuvent pas être réattribuées de manière fiable aux futurs utilisateurs, l’équipe a également décidé de faire évoluer le moteur de base de données vers **PostgreSQL**.

L’application legacy supporte actuellement SQLite / MySQL. Ces technologies restent donc une partie du point de départ audité, mais elles ne sont pas conservées comme moteur de persistence cible.

La transition devient :

```text
Legacy
SQLite / MySQL
     ↓
Abstraction Repository
     ↓
Prisma
     ↓
PostgreSQL
```

Cette décision constitue une modernisation maîtrisée de la technologie de persistence pour plusieurs raisons :

- l’application cible nécessite un nouveau schéma pour les utilisateurs, projets, tâches, permissions et notifications ;
- les anciens tickets ne sont pas importés dans le nouveau modèle authentifié ;
- il n’existe donc pas de contrainte de compatibilité historique imposant de conserver le moteur legacy ;
- changer de moteur pendant que la couche de données est déjà reconstruite évite une nouvelle migration d’infrastructure ultérieure ;
- Prisma permet de garder le reste du backend isolé des détails spécifiques à PostgreSQL.

Le changement de moteur doit rester indépendant de la logique métier : les controllers et services ne doivent jamais dépendre directement de PostgreSQL.

---

## 4. Justification

Une migration automatique des tickets historiques nécessiterait de choisir arbitrairement un propriétaire ou un niveau de visibilité.

Or aucune information dans le legacy ne permet d’établir cette propriété.

Trois scénarios ont été identifiés.

### Scénario A — Attribuer arbitrairement les tickets

```text
Todo legacy
     ↓
Utilisateur choisi arbitrairement
```

Cette solution est rejetée car elle introduirait des informations de propriété incorrectes et non vérifiables.

### Scénario B — Rendre tous les anciens tickets visibles à tous les utilisateurs

```text
Todos legacy
     ↓
Visible par tous les nouveaux comptes
```

Cette solution est également rejetée.

Le nouveau système introduit une authentification et une séparation des données entre utilisateurs. Publier les anciens tickets à tous les comptes contredirait ce modèle d’autorisation et créerait un risque inutile de divulgation d’informations.

### Scénario C — Ne pas migrer les tickets dont la propriété est inconnue

C’est la solution retenue.

Elle permet de démarrer le nouveau système avec un modèle de propriété cohérent :

```text
Utilisateur authentifié
        ↓
Projet autorisé
        ↓
Tâches du projet
```

Aucune donnée historique n’est attribuée ou exposée sans base fiable.

---

## 5. Considérations RGPD et confidentialité

La décision est également motivée par un principe de **minimisation du risque lié aux données**.

Le problème principal n’est pas d’affirmer que le RGPD interdit techniquement toute migration de ces données.

Le problème est que le legacy ne fournit aucune information permettant de déterminer :

- à qui appartient un ticket ;
- qui est autorisé à le consulter ;
- si son contenu peut être exposé à un nouvel utilisateur ;
- comment appliquer correctement les futures règles d’accès, d’export ou de suppression des données.

Une migration globale vers un espace partagé obligerait donc l’application à exposer des contenus historiques à des utilisateurs dont les droits sur ces contenus ne sont pas démontrables.

La décision retenue consiste à éviter cette situation dès la conception.

Le nouveau modèle garantit qu’une tâche est créée **après authentification**, dans un contexte utilisateur et projet connu.

---

## 6. Communication avant la mise à niveau

La suppression de la reprise automatique des tickets historiques doit être anticipée et communiquée aux utilisateurs.

Avant le déploiement de la nouvelle version, une période d’information doit être prévue.

Les utilisateurs seront avertis que :

- l’application va évoluer de TodoList vers une application Kanban avec comptes utilisateurs ;
- les anciennes tâches ne pourront pas être automatiquement associées à un compte ;
- les données legacy ne seront donc pas reprises dans les espaces utilisateurs du nouveau système ;
- les utilisateurs doivent conserver ou relever les informations importantes dont ils auront besoin après la migration ;
- après création de leur compte, ils pourront recréer les tâches encore pertinentes dans leurs nouveaux projets.

Le processus cible est donc :

```text
Annonce de la mise à niveau
        ↓
Période de préparation utilisateur
        ↓
Déploiement du nouveau système
        ↓
Création du compte
        ↓
Authentification
        ↓
Création du ou des projets
        ↓
Recréation des tâches encore pertinentes
```

Cette approche est préférable à une migration automatique dont les règles de propriété seraient artificielles.

---

## 7. Conséquence fonctionnelle assumée

Cette décision implique une **rupture volontaire de continuité des données historiques**.

Elle est acceptée car :

1. le modèle legacy ne permet pas d’identifier les propriétaires ;
2. la nouvelle application introduit une véritable gestion des utilisateurs ;
3. les nouvelles règles de sécurité doivent s’appliquer dès la création des nouvelles données ;
4. une période de communication permettra aux utilisateurs de préparer la transition ;
5. la migration technique reste progressive même si les données métier legacy ne sont pas reprises.

Cette décision doit être conservée dans la documentation d’audit et d’architecture afin qu’elle soit traçable et justifiable.

---

## 8. Architecture backend cible

L’architecture cible reste un **monolithe modulaire**.

```text
Frontend React
      │
      │ REST / JSON
      ▼
Node.js + Express + TypeScript
      │
      ▼
Controllers
      │
      ▼
Services
      │
      ├───────────────┐
      ▼               ▼
Repositories        Events
      │               │
      ▼               ▼
Prisma            RabbitMQ
      │
      ▼
PostgreSQL
```

Les responsabilités sont séparées de la manière suivante :

### Controllers

Responsables de la couche HTTP :

- lecture des paramètres ;
- récupération des données validées ;
- appel des services ;
- construction des réponses HTTP.

### Services

Responsables de la logique métier :

- authentification ;
- autorisation ;
- règles liées aux projets ;
- règles liées aux tâches ;
- transitions Kanban ;
- publication des événements métier.

### Repositories

Responsables de l’accès aux données.

Ils isolent la logique métier de Prisma et de la base de données.

### Prisma

Prisma devient progressivement la couche ORM utilisée par les repositories pour accéder à PostgreSQL.

### RabbitMQ

RabbitMQ est utilisé pour les traitements asynchrones et le workflow event-driven imposé par le projet.

---

## 9. Migration technique du backend

### Étape 1 — Établir la baseline

Avant tout refactor :

- documenter les endpoints existants ;
- documenter le modèle de données ;
- identifier les comportements fonctionnels actuels ;
- conserver ou ajouter des tests de caractérisation ;
- vérifier que le comportement legacy est reproductible.

### Étape 2 — Mettre en place les garde-fous

Ajouter progressivement :

```text
ESLint
TypeScript
Tests
Coverage
Analyse de qualité
CI
```

L’objectif est de sécuriser les modifications futures.

### Étape 3 — Introduire TypeScript

JavaScript et TypeScript peuvent coexister temporairement.

Le nouveau code est développé en TypeScript et les parties legacy sont migrées lorsqu’elles sont modifiées.

Il n’est pas prévu de convertir toute la codebase en une seule opération.

### Étape 4 — Créer les frontières architecturales

Passer progressivement de :

```text
Route
 ↓
Persistence
```

à :

```text
Route
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Persistence
```

Cette étape doit précéder les changements majeurs de persistence afin de réduire le couplage.

### Étape 5 — Introduire Prisma et PostgreSQL

Prisma est ajouté derrière les repositories et devient la frontière de migration entre la persistence legacy et la nouvelle base PostgreSQL.

```text
Persistence legacy
SQLite / MySQL
        ↓
Repository
        ↓
Prisma
        ↓
PostgreSQL
```

Le schéma PostgreSQL cible est créé à partir des nouveaux besoins métier et non en recopiant la structure legacy `todo_items`.

Le reste de l’application ne doit dépendre directement ni de Prisma ni de PostgreSQL.

### Étape 6 — Introduire le nouveau modèle utilisateur

Créer le modèle :

```text
User
```

avec notamment :

- identifiant ;
- informations de compte ;
- credentials sécurisés ;
- dates de création et de modification.

À partir de cette étape, les nouvelles données métier peuvent être associées à un utilisateur authentifié.

### Étape 7 — Introduire Projects et Tasks

Le modèle legacy :

```text
Todo
├── id
├── name
└── completed
```

est remplacé fonctionnellement par :

```text
Project
└── Tasks
    ├── id
    ├── title
    ├── description
    ├── status
    ├── priority
    ├── deadline
    ├── projectId
    ├── createdAt
    └── updatedAt
```

Les anciens `todo_items` ne sont pas automatiquement importés dans ce modèle.

### Étape 8 — Introduire l’autorisation

Chaque accès doit être contrôlé côté backend.

Exemple :

```text
Utilisateur A
    ↓
Projet A
    ↓
Tasks A
```

L’utilisateur A ne doit pas pouvoir consulter ou modifier les ressources privées de l’utilisateur B.

### Étape 9 — Introduire l’event-driven

Une fois le domaine Task stabilisé :

```text
TaskService
    │
    ├── persist task
    │
    └── publish task.created
                     ↓
                  RabbitMQ
                     ↓
             Notification Consumer
```

### Étape 10 — Retirer le code legacy devenu inutile

Une partie legacy ne doit être supprimée que lorsque :

- son remplacement est fonctionnel ;
- les tests passent ;
- la CI est valide ;
- la nouvelle persistence fonctionne ;
- aucune fonctionnalité active ne dépend encore du code concerné.

---

## 10. Stratégie de données cible

La nouvelle base doit disposer d’une propriété explicite des données.

Exemple simplifié :

```text
User
 └── Project
      └── Task
```

Une tâche ne doit pas exister sans contexte métier défini.

Les nouvelles données disposent ainsi dès leur création :

- d’un propriétaire ou d’un contexte d’autorisation identifiable ;
- de relations explicites ;
- de règles d’accès vérifiables ;
- d’un cycle de vie compatible avec les futures fonctions d’export et de suppression de compte.

---

## 11. Résultat attendu

À la fin de la migration, le backend doit être :

- majoritairement ou entièrement en TypeScript ;
- structuré en modules métier ;
- exposé via une API REST ;
- séparé en Controllers, Services et Repositories ;
- connecté à PostgreSQL via Prisma ;
- sécurisé par authentification et autorisation ;
- testable ;
- couvert par la CI et les contrôles qualité ;
- capable de produire et consommer des événements RabbitMQ ;
- débarrassé progressivement des accès persistence legacy.

La migration doit démontrer une **modernisation maîtrisée d’un système existant**, sans masquer les limitations du Legacy ni inventer une propriété des anciennes données qui n’existe pas.

---

## 12. Décision d’architecture à retenir

> **Les données `todo_items` historiques ne seront pas migrées automatiquement vers le nouveau modèle Kanban car le système legacy ne contient aucune information permettant d’en déterminer le propriétaire. Les attribuer arbitrairement ou les exposer à tous les nouveaux utilisateurs serait incompatible avec le modèle de sécurité et de confidentialité introduit par l’authentification. Les utilisateurs seront informés en amont de la mise à niveau afin de pouvoir conserver les informations nécessaires, puis recréer les tâches encore pertinentes après création et authentification de leur compte.**

Cette décision constitue une conséquence directe de l’audit du modèle de données legacy et doit rester documentée pendant toute la migration.
