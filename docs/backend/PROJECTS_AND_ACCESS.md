# Projects, roles, invitations and boards

Who can do what on a project, how people join it, and how boards split its
tasks. Full request/response schemas are in `backend/docs/openapi.yaml`
(served at `/api-docs`).

## Roles

A project has exactly one **owner** (`Project.ownerId`). Other people join
as **members** (`ProjectMember`), each with a role (`ProjectRole`):

| Action                                         | Owner | EDITOR | VIEWER |
| ---------------------------------------------- | :---: | :----: | :----: |
| See the project, its boards, tasks and team    |  yes  |  yes   |  yes   |
| Create, rename, delete boards                  |  yes  |  yes   |   no   |
| Create, edit, move, delete tasks; assign tasks |  yes  |  yes   |   no   |
| Rename / delete the project                    |  yes  |   no   |   no   |
| Invite, add, remove members; change their role |  yes  |   no   |   no   |

Everything else gets **403** `FORBIDDEN`. A project that does not exist
answers **404**.

These rules live in one place, `ProjectAccessGuard`
(`backend/src/shared/security/ProjectAccessGuard.ts`), used by the projects,
boards, tasks and invitations modules:

- `assertCanView`: owner or any member;
- `assertCanEdit`: owner or EDITOR member;
- `assertIsOwner`: owner only.

A task or a board never has permissions of its own: access is always derived
from the parent project.

The system-wide `ADMIN` role (`User.role`) is unrelated: it gives access to
the admin dashboard, not to projects. See [ADMIN_ROLE.md](ADMIN_ROLE.md).

### In the frontend

`getPermission(team, userId)` (`frontend/src/features/projects/api/team.api.ts`)
computes the same `owner` / `editor` / `viewer` value from
`GET /projects/:id/team`. VIEWER members get a read-only board: no "Add
task", no drag and drop, no edit dialog. This only hides controls; the API
still enforces every rule.

## Joining a project

Two ways, both owner only:

1. **Invitation**: the invitee must accept. This is what the frontend uses
   (the "Members" card of the project page; invitees see a "Project invitations" card on the Projects page).
2. **Direct add** (`POST /projects/:id/members`): the user becomes a member
   immediately, without being asked. API only, no UI uses it.

### Invitations

```text
owner                         invitee
  │ POST /projects/:id/invitations {email, role}
  │──────────────────────────────►  pending invitation
  │                                 │ GET /invitations ("Project invitations" card)
  │                                 │ POST /invitations/:id/accept  → member with `role`
  │                                 │ POST /invitations/:id/decline → invitation deleted
  │ DELETE /projects/:id/invitations/:invitationId (cancel while pending)
```

| Endpoint                                              | Who     | Result                                |
| ----------------------------------------------------- | ------- | ------------------------------------- |
| `POST /projects/:projectId/invitations`               | owner   | 201, the invitation (role defaults to VIEWER) |
| `GET /projects/:projectId/invitations`                | owner   | pending invitations of the project    |
| `DELETE /projects/:projectId/invitations/:invitationId` | owner | 204                                   |
| `GET /invitations`                                    | anyone  | invitations received by the caller    |
| `POST /invitations/:invitationId/accept`              | invitee | `{ projectId }`, caller is now a member |
| `POST /invitations/:invitationId/decline`             | invitee | 204                                   |

Rules:

- One pending invitation per (project, invitee): enforced by a unique
  constraint and checked first.
- An invitation addressed to someone else answers **404**
  `INVITATION_NOT_FOUND`, never 403, so invitation ids cannot be probed.
- Accepting when the user was added another way in the meantime just deletes
  the invitation.

Error codes:

| Code                   | Status | When                                      |
| ---------------------- | :----: | ----------------------------------------- |
| `USER_NOT_FOUND`       |  404   | No account with this email                |
| `INVITATION_NOT_FOUND` |  404   | Unknown invitation, or not yours          |
| `ALREADY_OWNER`        |  409   | Inviting the project owner                |
| `ALREADY_MEMBER`       |  409   | Already a member                          |
| `ALREADY_INVITED`      |  409   | A pending invitation already exists       |

### Members

| Endpoint                                          | Who    | Result                          |
| ------------------------------------------------- | ------ | ------------------------------- |
| `GET /projects/:projectId/members`                | viewer+ | members with their role        |
| `GET /projects/:projectId/team`                   | viewer+ | owner and members, for pickers |
| `POST /projects/:projectId/members`               | owner  | 201, member added directly      |
| `PATCH /projects/:projectId/members/:memberUserId` | owner | 200, `{ role }` changed         |
| `DELETE /projects/:projectId/members/:memberUserId` | owner | 204                            |

## Boards

A project has any number of boards. Each Kanban page shows **one** board:
`/projects/:projectId/kanban?boardId=:boardId`.

- `Task.boardId` links a task to its board. It must be a board of the
  **same project**: creating or moving a task onto another project's board
  (or an unknown board) answers **400** `BOARD_NOT_IN_PROJECT`
  (`TaskService.assertBoardInProject`).
- Tasks are loaded per project (`GET /projects/:id/tasks`) and filtered by
  board in the frontend (`useGetTasks(projectId, boardId)`); a task created
  from a board is created on it.
- Deleting a board does **not** delete its tasks: `boardId` is set to `null`
  (`onDelete: SetNull`).
- Tasks without a board (created before boards existed, or whose board was
  deleted) appear on no board. They are still listed in **My Tasks** when
  assigned, and through the API.

| Endpoint                          | Who     |
| --------------------------------- | ------- |
| `GET /projects/:projectId/boards` | viewer+ |
| `GET /boards/:boardId`            | viewer+ |
| `POST /projects/:projectId/boards` | editor+ |
| `PATCH /boards/:boardId`          | editor+ |
| `DELETE /boards/:boardId`         | editor+ |

## Assignment

`assigneeId` (on `POST /projects/:id/tasks` and `PATCH /tasks/:id`) must be
the owner or a member of the task's project, otherwise **400**
`ASSIGNEE_NOT_PROJECT_MEMBER`. `null` unassigns. The Kanban task dialog offers
a dropdown of the project team. Assigning publishes `task.assigned`, which
notifies the new assignee (see [NOTIFICATIONS.md](NOTIFICATIONS.md)).

## Code map

- `src/shared/security/ProjectAccessGuard.ts`: the permission rules
- `src/modules/projects/`: projects, members, team
- `src/modules/invitations/`: invitations
- `src/modules/boards/`: boards
- `src/modules/tasks/TaskService.ts`: board and assignee checks on tasks
- Tests: `src/tests/vitest/{project,invitation,board,task}/`
