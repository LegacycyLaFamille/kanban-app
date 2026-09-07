# Conventions API et backend

## 1. Objectif

Ce document définit les conventions backend et API REST du projet de refonte Kanban.

L’application est modernisée progressivement à partir du système legacy existant. Le backend cible reste basé sur **Node.js et Express**, avec une migration progressive de JavaScript vers TypeScript.

L’architecture cible est un **monolithe modulaire**, et non une architecture microservices.

---

## 2. Architecture cible

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
      ├────────────────┐
      ▼                ▼
Repositories         Events
      │                │
      ▼                ▼
Prisma             RabbitMQ
      │
      ▼
PostgreSQL
```

La migration doit rester incrémentale. Le JavaScript legacy et l’ancienne implémentation de persistence peuvent temporairement coexister avec l’architecture cible pendant la migration des modules.

---

## 3. API REST et Prisma

REST et Prisma répondent à des besoins différents et sont utilisés ensemble.

### API REST

L’API REST est l’interface exposée par le backend au frontend.

Elle est responsable de :

- recevoir les requêtes HTTP ;
- exposer les ressources de l’application ;
- appliquer les middlewares d’authentification ;
- valider les données des requêtes ;
- retourner des réponses HTTP contrôlées.

### Prisma

Prisma est l’ORM utilisé dans la couche de persistence du backend.

Il est responsable de :

- interroger PostgreSQL ;
- gérer les relations ;
- gérer les transactions ;
- définir le schéma ;
- gérer les migrations de base de données.

Le frontend ne doit jamais accéder directement à Prisma.

---

## 4. Responsabilités des couches

### Routes

Les routes déclarent les endpoints HTTP et les middlewares.

Elles doivent rester légères et déléguer le traitement aux controllers.

### Controllers

Les controllers gèrent les éléments propres à HTTP :

- paramètres de route ;
- données validées ;
- contexte d’authentification ;
- appels aux services ;
- réponses HTTP.

Ils ne doivent contenir ni SQL, ni requête Prisma, ni règle métier.

### Services

Les services contiennent la logique applicative et métier :

- authentification ;
- autorisation ;
- propriété des projets ;
- cycle de vie des tâches ;
- transitions Kanban ;
- publication des événements métier.

Les services ne doivent pas dépendre directement d’Express.

### Repositories

Les repositories encapsulent l’accès aux données.

Pendant la transition, un repository peut temporairement encapsuler la persistence legacy. La cible utilise Prisma.

```text
Service
   ↓
Repository
   ├── persistence legacy   (temporaire)
   └── Prisma               (cible)
          ↓
        PostgreSQL
```

Les services métier ne doivent pas contenir de requêtes spécifiques à Prisma.

---

## 5. Nommage des ressources

Utiliser des noms au pluriel et en minuscules :

```text
/api/users
/api/projects
/api/tasks
/api/notifications
```

Utiliser les ressources imbriquées lorsque la relation est pertinente :

```text
/api/projects/:projectId/tasks
```

Éviter les verbes d’action dans les noms de ressources.

À éviter :

```text
POST /api/createTask
GET  /api/getProjects
```

Préférer :

```text
POST /api/tasks
GET  /api/projects
```

---

## 6. Méthodes HTTP

| Opération | Méthode |
|---|---|
| Créer | `POST` |
| Lire une collection | `GET` |
| Lire une ressource | `GET` |
| Mise à jour partielle | `PATCH` |
| Supprimer | `DELETE` |

Projets :

```text
POST   /api/projects
GET    /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
```

Tâches :

```text
POST   /api/projects/:projectId/tasks
GET    /api/projects/:projectId/tasks
GET    /api/tasks/:taskId
PATCH  /api/tasks/:taskId
DELETE /api/tasks/:taskId
```

---

## 7. Codes HTTP

Utiliser les sémantiques HTTP standards de façon cohérente.

| Code | Signification |
|---:|---|
| `200` | Succès |
| `201` | Ressource créée |
| `204` | Succès sans corps de réponse |
| `400` | Requête invalide |
| `401` | Authentification absente ou invalide |
| `403` | Authentifié mais non autorisé |
| `404` | Ressource inexistante |
| `409` | Conflit |
| `422` | Donnée sémantiquement invalide lorsque cette convention est retenue |
| `500` | Erreur serveur inattendue |

Une erreur applicative connue ne doit pas être retournée avec `200`.

---

## 8. Format des erreurs

Utiliser une structure prévisible :

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found"
  }
}
```

Les erreurs de validation peuvent détailler les champs :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {
      "name": ["Name is required"]
    }
  }
}
```

Ne jamais exposer de stack trace, erreur Prisma brute, erreur SQL ou credential.

---

## 9. Authentification et autorisation

L’authentification répond à :

> Qui est l’utilisateur ?

L’autorisation répond à :

> Cet utilisateur a-t-il le droit d’effectuer cette opération ?

L’autorisation doit être appliquée côté backend, principalement dans la couche service/domaine.

Les règles d’affichage du frontend ne constituent jamais une frontière de sécurité.

Toute nouvelle donnée métier doit être créée dans un contexte authentifié et autorisé.

---

## 10. Validation des entrées

Valider toutes les entrées externes avant leur passage dans la logique métier :

- bodies ;
- paramètres de route ;
- query parameters ;
- variables d’environnement ;
- payloads d’événements.

Une bibliothèque de schémas comme Zod peut être utilisée.

Flux cible :

```text
Requête HTTP
    ↓
Validation du schéma
    ↓
Controller
    ↓
Service
```

---

## 11. Prisma et PostgreSQL

L’application legacy repose actuellement sur une persistence SQLite ou MySQL. L’architecture cible standardise volontairement la nouvelle couche de données sur **PostgreSQL**.

Il s’agit d’une évolution technologique maîtrisée et non d’un prérequis au refactor architectural. Cette décision est justifiée car :

- le domaine cible nécessite un nouveau schéma relationnel pour les utilisateurs, projets, tâches, autorisations et notifications ;
- les données métier legacy ne sont pas migrées automatiquement car leur propriétaire ne peut pas être déterminé de manière fiable ;
- la couche de données doit donc déjà être reconstruite et versionnée ;
- effectuer le passage à PostgreSQL à cette frontière évite une seconde migration de moteur de base de données ultérieure.

Prisma est introduit progressivement comme ORM cible.

```text
Persistence legacy
SQLite / MySQL
        ↓
Frontière de migration Repository
        ↓
Prisma
        ↓
PostgreSQL
```

Le reste de l’application doit rester isolé du moteur de base de données grâce aux repositories.

Utiliser les transactions Prisma lorsque plusieurs opérations de persistence doivent réussir ou échouer ensemble.

Les évolutions du schéma doivent être versionnées via les migrations Prisma.

---

## 12. Données métier legacy

Les anciens `todo_items` ne sont **pas migrés automatiquement** dans le domaine Kanban authentifié.

Le modèle legacy ne contient aucune relation utilisateur/propriétaire. L’application ne peut donc pas déterminer de façon fiable quel futur utilisateur doit posséder chaque ticket.

Le système ne doit pas :

- attribuer arbitrairement les tickets legacy ;
- exposer tous les tickets legacy à tous les nouveaux utilisateurs ;
- inventer une information de propriété.

Les utilisateurs doivent être informés avant la mise à niveau et disposer d’un délai pour conserver les informations encore utiles. Les tâches pertinentes pourront ensuite être recréées après création du compte et authentification.

La justification complète est documentée dans :

- [`../architecture/BACKEND_MIGRATION.md`](../architecture/BACKEND_MIGRATION.md)
- [`../architecture/BACKEND_MIGRATION.fr.md`](../architecture/BACKEND_MIGRATION.fr.md)

---

## 13. Événements métier et RabbitMQ

Les événements métier sont publiés après le succès de l’opération concernée.

Exemple :

```text
POST /api/tasks
      ↓
TaskController
      ↓
TaskService
      ├── persistance via Repository / Prisma
      └── publication task.created
                    ↓
                 RabbitMQ
                    ↓
          Notification Consumer
```

RabbitMQ est une infrastructure de support ajoutée pour répondre aux besoins asynchrones et event-driven. Son utilisation ne transforme pas l’application en microservices.

---

## 14. OpenAPI

L’API REST doit être documentée avec OpenAPI lorsque les endpoints sont suffisamment stabilisés.

La documentation doit inclure :

- endpoints ;
- schémas de requêtes ;
- schémas de réponses ;
- authentification ;
- codes HTTP ;
- format des erreurs.

La documentation OpenAPI ne remplace pas les tests automatisés.
