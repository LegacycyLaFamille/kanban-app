# Authorization audit (S3-08)

**Date**: 2026-10-02 · **Scope**: access control on projects, members,
invitations, boards, tasks, notifications, exports and admin routes, on the
delivery candidate (`feat/S3-board-scoped-kanban`).
French version: [AUTHORIZATION_AUDIT.fr.md](AUTHORIZATION_AUDIT.fr.md).
Rules: [PROJECTS_AND_ACCESS.md](../backend/PROJECTS_AND_ACCESS.md).

## Method

Every cell of the matrix below is an automated test against the **real
application and a real PostgreSQL** database:
[`backend/src/tests/integration/api/authorization.api.int.test.ts`](../../backend/src/tests/integration/api/authorization.api.int.test.ts)
(137 tests, run in CI by the `integration-backend` job).

- Five accounts, each with its own session: **owner** of project A,
  **editor** (EDITOR member of A), **viewer** (VIEWER member of A),
  **outsider** (owner of an unrelated project B) and **admin** (system
  `ADMIN` role, member of nothing).
- Before **every** case the projects are recreated, so a mutation allowed
  for one role never hides a refusal for another.
- Resources are always addressed by their **direct id** (`/tasks/:id`,
  `/boards/:id`…), the way an attacker would.
- A refused request must answer 403 `FORBIDDEN` **and** change nothing in
  the database (checked).

## Matrix

| Action | Owner | Editor | Viewer | Outsider | Admin |
| --- | :-: | :-: | :-: | :-: | :-: |
| Read project | 200 | 200 | 200 | 403 | 403 |
| Rename project | 200 | 403 | 403 | 403 | 403 |
| Delete project | 204 | 403 | 403 | 403 | 403 |
| List members / read team | 200 | 200 | 200 | 403 | 403 |
| Add a member | 201 | 403 | 403 | 403 | 403 |
| Change a member's role | 200 | 403 | 403 | 403 | 403 |
| Remove a member | 204 | 403 | 403 | 403 | 403 |
| Invite | 201 | 403 | 403 | 403 | 403 |
| List / cancel project invitations | 200 / 204 | 403 | 403 | 403 | 403 |
| List boards | 200 | 200 | 200 | 403 | 403 |
| Create board | 201 | 201 | 403 | 403 | 403 |
| Read board by id | 200 | 200 | 200 | 403 | 403 |
| Rename / delete board | 200 / 204 | 200 / 204 | 403 | 403 | 403 |
| List tasks | 200 | 200 | 200 | 403 | 403 |
| Create task | 201 | 201 | 403 | 403 | 403 |
| Read task by id | 200 | 200 | 200 | 403 | 403 |
| Move / assign task | 200 | 200 | 403 | 403 | 403 |
| Delete task | 204 | 204 | 403 | 403 | 403 |
| Admin: list all tasks, assign, system status | 403 | 403 | 403 | 403 | 200 |

Members read everything in their project; only the owner and EDITOR members
write; only the owner manages the project and its membership. The system
admin role grants the admin routes only, never project access.

## Cross-project, cross-board and per-user checks

| Check | Result |
| --- | --- |
| Owner of A on project B's project, board and task ids (read, rename, move, delete, create a task in B) | 403 each, nothing changed |
| Create a task in A on B's board, or move A's task to B's board | 400 `BOARD_NOT_IN_PROJECT`, task unchanged |
| Move a task to another project through `projectId` in the payload | 400 (unknown field), task unchanged |
| Assign a task to a user outside its project (project route and admin route) | 400 `ASSIGNEE_NOT_PROJECT_MEMBER` |
| Project and task lists | only the caller's projects; only the project's tasks |
| Member removed, or EDITOR demoted to VIEWER | write refused on their **next** request (role read on every request, never cached) |
| Accept / decline an invitation addressed to someone else (all five roles) | 404, so invitation ids cannot be probed |
| Mark or list another user's notification | 404 / absent, `readAt` unchanged |
| Data export | only the caller's own projects |

## Findings

| # | Finding | Severity | Status |
| - | --- | --- | --- |
| Z1 | **Board routes had no input validation**: a board without a name answered 500 (Prisma error), an empty name or an unknown field created the board (201). | Medium | Fixed: `boards/board.schema.ts`, strict schema on create and rename (400 `VALIDATION_ERROR`) |
| Z2 | Board access used `project.ownerId === userId` instead of the shared guard: members were refused boards of their own project (#156). | High | Fixed earlier in Sprint 3 (`BoardService` uses `ProjectAccessGuard`); now covered by the matrix |
| Z3 | A task could be created on, or moved to, a board of another project. | High | Fixed earlier in Sprint 3 (`TaskService.assertBoardInProject`); now covered by the matrix |

No blocking finding remains.

## Accepted limitations

- **403 rather than 404** for an existing resource the caller cannot see:
  it reveals that the id exists. Ids are random UUIDs, so they cannot be
  guessed; invitations and notifications, which are per user, answer 404.
- **The owner can add a member directly** (`POST /projects/:id/members`)
  without the user's consent; the UI only uses invitations.
- ~~The legacy TodoList API (`/api/legacy/items`) had no authentication.~~
  **Resolved**: the legacy application and its API were removed
  ([ADR-011](../adr/ADR-011-remove-legacy-todolist.md)). Without a session, only
  registration, login, refresh, `/api/v1/health`, the API documentation
  (`/api-docs`) and `/` (container health check) answer.
- An owner cannot leave or transfer their project (not a feature yet).
