# Conventions API et backend

## Architecture
Le projet utilise un **monolithe modulaire**, pas des microservices.

```text
Frontend React
     │ HTTP / JSON
     ▼
API REST / Express
     ▼
Controllers
     ▼
Services
     ▼
Repositories
     ▼
ORM Prisma
     ▼
PostgreSQL
```

RabbitMQ est utilisé séparément pour les workflows asynchrones orientés événements.

## Responsabilités des couches

### Controller
Gère les éléments propres à HTTP et appelle un service. Il ne contient pas de logique de persistance.

### Service
Contient les règles métier, les règles d’autorisation, l’orchestration et la publication d’événements métier.

### Repository
Encapsule l’accès à la persistance et les requêtes Prisma.

### Prisma
Mécanisme d’infrastructure utilisé par les repositories pour communiquer avec PostgreSQL.

## Nommage des ressources REST
Utiliser des ressources au pluriel :
```text
/api/users
/api/projects
/api/tasks
/api/notifications
```

Tâches imbriquées :
```text
/api/projects/:projectId/tasks
```

## Méthodes HTTP
- `POST` création
- `GET` lecture
- `PATCH` mise à jour partielle
- `DELETE` suppression

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

## Codes HTTP
- `200` succès
- `201` création
- `204` succès sans contenu
- `400` requête invalide
- `401` authentification absente/invalide
- `403` accès interdit
- `404` ressource inexistante
- `409` conflit
- `500` erreur serveur inattendue

## Format des erreurs
Recommandation :
```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found"
  }
}
```

Ne pas exposer de stack trace ou d’erreur brute de base de données.

## Authentification et autorisation
L’authentification répond à : **Qui est l’utilisateur ?**

L’autorisation répond à : **Cet utilisateur peut-il effectuer cette opération ?**

Les règles d’autorisation appartiennent à la couche service/domaine du backend, pas uniquement au frontend.

## Transactions
Utiliser les transactions Prisma lorsque plusieurs opérations doivent réussir ou échouer ensemble.

## Événements
Exemple :
```text
POST /api/tasks
      ↓
TaskService
      ├── persistance via Repository / Prisma
      └── publication task.created
                    ↓
                 RabbitMQ
```

## OpenAPI
Documenter les endpoints, schémas, mécanismes d’authentification, codes HTTP et erreurs avec OpenAPI lorsqu’il sera implémenté.
