# Audit des autorisations (S3-08)

**Date** : 2026-10-02 · **Périmètre** : contrôle d'accès sur les projets,
membres, invitations, boards, tâches, notifications, exports et routes
admin, sur la version candidate (`feat/S3-board-scoped-kanban`).
Version anglaise : [AUTHORIZATION_AUDIT.md](AUTHORIZATION_AUDIT.md).
Règles : [PROJECTS_AND_ACCESS.md](../backend/PROJECTS_AND_ACCESS.md).

## Méthode

Chaque case de la matrice ci-dessous est un test automatisé contre
**l'application réelle et une vraie base PostgreSQL** :
[`backend/src/tests/integration/api/authorization.api.int.test.ts`](../../backend/src/tests/integration/api/authorization.api.int.test.ts)
(137 tests, exécutés en CI par le job `integration-backend`).

- Cinq comptes, chacun avec sa propre session : **propriétaire** du projet
  A, **éditeur** (membre EDITOR de A), **lecteur** (membre VIEWER de A),
  **extérieur** (propriétaire d'un projet B sans lien) et **admin** (rôle
  système `ADMIN`, membre d'aucun projet).
- Avant **chaque** cas, les projets sont recréés : une modification
  autorisée pour un rôle ne masque jamais un refus pour un autre.
- Les ressources sont toujours visées par leur **identifiant direct**
  (`/tasks/:id`, `/boards/:id`…), comme le ferait un attaquant.
- Une requête refusée doit répondre 403 `FORBIDDEN` **et** ne rien modifier
  en base (vérifié).

## Matrice

| Action | Propriétaire | Éditeur | Lecteur | Extérieur | Admin |
| --- | :-: | :-: | :-: | :-: | :-: |
| Lire le projet | 200 | 200 | 200 | 403 | 403 |
| Renommer le projet | 200 | 403 | 403 | 403 | 403 |
| Supprimer le projet | 204 | 403 | 403 | 403 | 403 |
| Lister les membres / lire l'équipe | 200 | 200 | 200 | 403 | 403 |
| Ajouter un membre | 201 | 403 | 403 | 403 | 403 |
| Changer le rôle d'un membre | 200 | 403 | 403 | 403 | 403 |
| Retirer un membre | 204 | 403 | 403 | 403 | 403 |
| Inviter | 201 | 403 | 403 | 403 | 403 |
| Lister / annuler les invitations du projet | 200 / 204 | 403 | 403 | 403 | 403 |
| Lister les boards | 200 | 200 | 200 | 403 | 403 |
| Créer un board | 201 | 201 | 403 | 403 | 403 |
| Lire un board par son id | 200 | 200 | 200 | 403 | 403 |
| Renommer / supprimer un board | 200 / 204 | 200 / 204 | 403 | 403 | 403 |
| Lister les tâches | 200 | 200 | 200 | 403 | 403 |
| Créer une tâche | 201 | 201 | 403 | 403 | 403 |
| Lire une tâche par son id | 200 | 200 | 200 | 403 | 403 |
| Déplacer / assigner une tâche | 200 | 200 | 403 | 403 | 403 |
| Supprimer une tâche | 204 | 204 | 403 | 403 | 403 |
| Admin : toutes les tâches, assignation, état du système | 403 | 403 | 403 | 403 | 200 |

Les membres lisent tout leur projet ; seuls le propriétaire et les membres
EDITOR écrivent ; seul le propriétaire gère le projet et ses membres. Le
rôle admin système donne accès aux routes admin uniquement, jamais aux
projets.

## Contrôles inter-projets, inter-boards et par utilisateur

| Contrôle | Résultat |
| --- | --- |
| Propriétaire de A sur les ids du projet, du board et de la tâche de B (lecture, renommage, déplacement, suppression, création d'une tâche dans B) | 403 à chaque fois, rien n'est modifié |
| Créer une tâche de A sur le board de B, ou déplacer une tâche de A vers le board de B | 400 `BOARD_NOT_IN_PROJECT`, tâche inchangée |
| Déplacer une tâche vers un autre projet via `projectId` dans le corps | 400 (champ inconnu), tâche inchangée |
| Assigner une tâche à quelqu'un d'extérieur au projet (route projet et route admin) | 400 `ASSIGNEE_NOT_PROJECT_MEMBER` |
| Listes de projets et de tâches | uniquement les projets de l'appelant ; uniquement les tâches du projet |
| Membre retiré, ou EDITOR rétrogradé en VIEWER | écriture refusée **dès sa requête suivante** (rôle relu à chaque requête, jamais mis en cache) |
| Accepter / refuser l'invitation de quelqu'un d'autre (les cinq rôles) | 404 : impossible de sonder les ids d'invitation |
| Marquer ou lister la notification d'un autre utilisateur | 404 / absente, `readAt` inchangé |
| Export de données | uniquement les projets de l'appelant |

## Constats

| # | Constat | Gravité | État |
| - | --- | --- | --- |
| Z1 | **Les routes des boards ne validaient pas les données** : un board sans nom répondait 500 (erreur Prisma), un nom vide ou un champ inconnu créait le board (201). | Moyenne | Corrigé : `boards/board.schema.ts`, schéma strict à la création et au renommage (400 `VALIDATION_ERROR`) |
| Z2 | L'accès aux boards utilisait `project.ownerId === userId` au lieu du garde partagé : les membres étaient refusés sur les boards de leur propre projet (#156). | Haute | Corrigé plus tôt dans le Sprint 3 (`BoardService` utilise `ProjectAccessGuard`) ; désormais couvert par la matrice |
| Z3 | Une tâche pouvait être créée sur le board d'un autre projet, ou déplacée vers lui. | Haute | Corrigé plus tôt dans le Sprint 3 (`TaskService.assertBoardInProject`) ; désormais couvert par la matrice |

Aucun constat bloquant ne subsiste.

## Limites acceptées

- **403 plutôt que 404** pour une ressource existante que l'appelant ne
  peut pas voir : cela révèle que l'id existe. Les ids sont des UUID
  aléatoires, impossibles à deviner ; les invitations et notifications,
  propres à chaque utilisateur, répondent 404.
- **Le propriétaire peut ajouter un membre directement**
  (`POST /projects/:id/members`) sans son accord ; l'interface n'utilise
  que les invitations.
- ~~**L'API de la TodoList legacy** (`/api/legacy/items`) n'a pas
  d'authentification, par conception : c'est l'application d'avant la
  migration, conservée sur `/legacy`
  ([ADR-010](../adr/ADR-010-landing-page-and-legacy-route.fr.md)), sans
  données de compte. Elle devra disparaître avec l'application legacy.~~
  **Résolu** : l'application legacy et son API ont été retirées
  ([ADR-011](../adr/ADR-011-remove-legacy-todolist.fr.md)). Sans session, seules répondent
  l'inscription, la connexion, le rafraîchissement, `/api/v1/health`, la
  documentation de l'API (`/api-docs`) et `/` (healthcheck du conteneur).
- Un propriétaire ne peut pas quitter ni transférer son projet (pas encore
  une fonctionnalité).
