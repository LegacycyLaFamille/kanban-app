# Conventions de nommage

## 1. Règles générales

- Utiliser l’anglais pour le code source, les noms de fichiers, les routes API, les identifiants de base de données, les événements, les branches, les commits et les Pull Requests.
- Préférer des noms explicites aux abréviations.
- Utiliser le même vocabulaire métier partout : `User`, `Project`, `Task`, `Notification`.
- Le nouveau code TypeScript applique immédiatement ces conventions ; le JavaScript legacy est aligné progressivement lorsqu’il est migré ou modifié.

---

## 2. Frontend

Le frontend cible est organisé par fonctionnalités.

```text
src/
├── app/
├── features/
│   ├── auth/
│   ├── projects/
│   ├── tasks/
│   ├── kanban/
│   ├── users/
│   └── notifications/
└── shared/
```

### Composants

Utiliser `PascalCase` :

```text
TaskCard.tsx
KanbanBoard.tsx
LoginForm.tsx
```

Le nom du composant doit correspondre au fichier.

### Hooks

Utiliser `camelCase` avec le préfixe `use` :

```text
useTasks.ts
useProjects.ts
useAuth.ts
```

### Fichiers API des features

Utiliser le nom du domaine suivi de `.api.ts` :

```text
tasks.api.ts
projects.api.ts
auth.api.ts
```

### Fonctions et variables

Utiliser `camelCase` :

```text
createTask()
loadProjects()
projectId
currentUser
```

### Constantes

Utiliser `UPPER_SNAKE_CASE` pour les constantes globales :

```text
MAX_LOGIN_ATTEMPTS
DEFAULT_PAGE_SIZE
```

### Types

Utiliser `PascalCase` :

```text
Task
Project
CreateTaskInput
TaskStatus
```

Ne pas préfixer les interfaces avec `I`.

---

## 3. Backend

Les modules métier utilisent des noms de domaine en minuscules :

```text
auth/
users/
projects/
tasks/
notifications/
```

Utiliser `PascalCase` pour les classes et types exportés :

```text
TaskController
TaskService
TaskRepository
```

Utiliser des noms de fichiers en minuscules avec le rôle séparé par un point :

```text
task.routes.ts
task.controller.ts
task.service.ts
task.repository.ts
task.schema.ts
```

---

## 4. API REST

Utiliser des ressources au pluriel et en minuscules :

```text
/api/users
/api/projects
/api/tasks
/api/notifications
```

Les paramètres de route utilisent `camelCase` :

```text
:projectId
:taskId
:userId
```

Les propriétés JSON utilisent `camelCase`.

Éviter les verbes dans les noms de ressources.

---

## 5. Prisma et PostgreSQL

Les modèles Prisma utilisent le singulier en `PascalCase` :

```text
User
Project
Task
Notification
```

Les champs Prisma utilisent `camelCase` :

```text
createdAt
updatedAt
projectId
ownerId
```

Les tables et colonnes PostgreSQL utilisent `snake_case`.

Les tables utilisent le pluriel :

```text
users
projects
tasks
notifications
project_members
```

Colonnes :

```text
created_at
updated_at
project_id
owner_id
```

Mapping Prisma recommandé :

```prisma
model Project {
  id        String   @id @default(uuid())
  createdAt DateTime @map("created_at")

  @@map("projects")
}
```

Les noms explicites d’index et de contraintes doivent être descriptifs :

```text
idx_tasks_project_id
idx_tasks_status
uq_users_email
fk_tasks_project_id
```

---

## 6. Événements et RabbitMQ

Les événements métier utilisent :

```text
<domaine>.<action>
```

Exemples :

```text
task.created
task.updated
task.completed
project.created
user.deleted
```

Utiliser des minuscules et éviter les détails techniques d’implémentation.

Les files RabbitMQ utilisent des noms explicites en minuscules :

```text
notifications.task-created
notifications.task-completed
```

Exchange recommandé :

```text
domain-events
```

---

## 7. Variables d’environnement

Utiliser `UPPER_SNAKE_CASE` :

```text
DATABASE_URL
DATABASE_URL_TEST
RABBITMQ_URL
JWT_SECRET
NODE_ENV
PORT
```

Ne jamais versionner de secret.

---

## 8. Docker

Utiliser des noms de services en minuscules :

```text
frontend
backend
postgres
rabbitmq
```

Les noms d’images restent en minuscules :

```text
kanban-app-frontend
kanban-app-backend
```

---

## 9. Tests

Unitaires :

```text
task.service.test.ts
auth.service.test.ts
```

Intégration :

```text
tasks.integration.test.ts
events.integration.test.ts
```

E2E :

```text
authentication.e2e.test.ts
kanban-workflow.e2e.test.ts
```

Les descriptions de tests doivent décrire un comportement observable.

---

## 10. Issues GitHub

Utiliser l’identifiant de sprint suivi d’une action :

```text
S1-17 — Implement login
S2-20 — Implement Kanban status rules
```

---

## 11. Branches

Les règles de branches sont définies dans `GIT_CONVENTIONS.fr.md`.

Exemple :

```text
feature/S1-17-login
```
