# Conventions de nommage

## Règles générales
- Utiliser l’anglais pour le code source, les noms de fichiers, les routes API, les identifiants de base de données, les événements, les branches, les commits et les Pull Requests.
- Préférer des noms explicites aux abréviations.
- Utiliser systématiquement le vocabulaire métier : `User`, `Project`, `Task`, `Notification`.

## Frontend
- Composants React : `PascalCase` — `TaskCard.tsx`
- Hooks : `camelCase` préfixé par `use` — `useTasks.ts`
- Fonctions et variables : `camelCase` — `createTask`, `projectId`
- Constantes globales : `UPPER_SNAKE_CASE` — `MAX_LOGIN_ATTEMPTS`
- Types et interfaces : `PascalCase` — `Task`, `CreateTaskInput`
- Ne pas préfixer les interfaces avec `I`.

## Backend
Les classes et types exportés utilisent `PascalCase` :
- `TaskController`
- `TaskService`
- `TaskRepository`

Noms de fichiers recommandés :
- `task.controller.ts`
- `task.service.ts`
- `task.repository.ts`
- `task.schema.ts`
- `task.routes.ts`

Les dossiers de modules utilisent le nom du domaine en minuscules :
`auth/`, `users/`, `projects/`, `tasks/`, `notifications/`.

## API REST
Utiliser des noms de ressources au pluriel et en minuscules :
- `/api/users`
- `/api/projects`
- `/api/tasks`
- `/api/notifications`

Ressource imbriquée :
`/api/projects/:projectId/tasks`

Les paramètres de route et les propriétés JSON utilisent `camelCase`.

Éviter les verbes dans les routes :
- Éviter `POST /api/createTask`
- Préférer `POST /api/tasks`

## Prisma et PostgreSQL
Les modèles Prisma utilisent le singulier en `PascalCase` :
`User`, `Project`, `Task`, `Notification`.

Les champs Prisma utilisent `camelCase` :
`createdAt`, `projectId`, `ownerId`.

Les tables et colonnes PostgreSQL utilisent `snake_case` :
- tables : `users`, `projects`, `tasks`, `notifications`
- colonnes : `created_at`, `project_id`, `owner_id`

Mapping Prisma recommandé :
```prisma
model Project {
  id        String   @id @default(uuid())
  createdAt DateTime @map("created_at")

  @@map("projects")
}
```

Index et contraintes :
- `idx_tasks_project_id`
- `uq_users_email`
- `fk_tasks_project_id`

## Événements et RabbitMQ
Les événements métier utilisent `<domaine>.<action>` :
- `task.created`
- `task.updated`
- `task.completed`
- `project.created`

Les files RabbitMQ utilisent des noms explicites en minuscules :
- `notifications.task-created`
- `notifications.task-completed`

## Variables d’environnement
Utiliser `UPPER_SNAKE_CASE` :
`DATABASE_URL`, `RABBITMQ_URL`, `JWT_SECRET`, `NODE_ENV`.

## Docker
Les services Compose et noms d’images restent en minuscules :
`frontend`, `backend`, `postgres`, `rabbitmq`.

## Tests
- Unitaire : `task.service.test.ts`
- Intégration : `tasks.integration.test.ts`
- E2E : `kanban-workflow.e2e.test.ts`

Les descriptions de tests doivent décrire un comportement observable.

## Issues GitHub
Format :
`S1-17 — Implement login`

## Branches
Voir `GIT_CONVENTIONS.fr.md`.

Exemple :
`feature/S1-17-login`
