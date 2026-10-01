# Frontend: routes and features

What the React app does today, page by page, and where each piece lives.
Architecture rules: [ADR-004](../adr/ADR-004-feature-based-frontend.md) and
[FRONTEND_MIGRATION.md](../architecture/FRONTEND_MIGRATION.md). Tests:
[TESTING.md](TESTING.md). Accessibility: [ACCESSIBILITY_RGAA.md](../standards/ACCESSIBILITY_RGAA.md).

## Routes

Defined in `frontend/src/app/router.tsx`.

| Path                                  | Access        | Page                                      |
| ------------------------------------- | ------------- | ----------------------------------------- |
| `/`                                   | public        | Landing page, with sign-in / sign-up      |
| `/login`, `/register`                 | public        | Standalone auth pages                     |
| `/403`, any unknown path              | public        | Forbidden / Not found                     |
| `/projects`                           | signed in     | Projects list, received invitations       |
| `/projects/:projectId`                | signed in     | Project details: boards, members          |
| `/projects/:projectId/kanban?boardId=` | signed in    | Kanban of one board                       |
| `/tasks`                              | signed in     | My Tasks: tasks assigned to me            |
| `/notifications`                      | signed in     | Notifications                             |
| `/profile`                            | signed in     | Profile, accessibility, data export       |
| `/admin/dashboard`                    | `ADMIN` role  | All tasks, assignment                     |
| `/admin/system`                       | `ADMIN` role  | System status: services, event queues, activity, recent errors, Grafana link |

`ProtectedRoute` sends signed-out users to `/login` (and back afterwards);
`RequireAdmin` sends non-admins back to `/projects`. Signed-in pages share
`MainLayout` (sidebar, skip link, unread-notifications badge). Admins also
get the "Dashboard" and "System" entries. The legacy TodoList was removed
([ADR-011](../adr/ADR-011-remove-legacy-todolist.md)).

## Features (`frontend/src/features/`)

| Folder          | What it does                                                      |
| --------------- | ----------------------------------------------------------------- |
| `landing/`      | Marketing page on `/`                                              |
| `auth/`         | Session (`AuthProvider`), login/register forms, route guards       |
| `projects/`     | Projects CRUD, boards, members, invitations                        |
| `kanban/`       | Board, columns, task cards, task dialog, drag and drop             |
| `tasks/`        | My Tasks                                                           |
| `notifications/`| Notifications page and unread badge                                |
| `profile/`      | Profile details, stats, accessibility settings, data export        |
| `admin/`        | Admin dashboard (tasks) and system status page                     |
| `errors/`       | 403 and 404 pages                                                  |

Shared code is in `frontend/src/shared/`: `api/` (the only HTTP client,
`httpClient`, which refreshes the session once on a 401), `components/`
(`AppLogo`, `Feedback` loading/empty/error states), `preferences/`
(colour-vision setting), `utils/`.

## Landing page (`/`)

`features/landing/`. A product presentation with motion design, and the
entry point for new users.

- Hero with an animated headline and a looping Kanban mock-up
  (`HeroBoard`): a card travels To Do → In Progress → Done and a
  notification pops. Pure CSS animations, no animation library.
- Feature grid and "How it works" steps revealed on scroll
  (`useRevealOnScroll`, IntersectionObserver).
- `AuthPanel`: **Sign in** and **Create account** as ARIA tabs (arrow keys,
  Home/End). The header and hero buttons pick the tab and scroll to it.
  Signing in opens `/projects`; creating an account switches to Sign in with
  a confirmation. A signed-in visitor sees "Open my workspace" instead.
- The forms are the same components as `/login` and `/register`
  (`features/auth/components/LoginForm.tsx`, `RegisterForm.tsx`).
- Accessibility: "Pause animations" button (WCAG 2.2.2 / RGAA 13.8), no
  motion at all under `prefers-reduced-motion`, skip link, the mock-up is
  `aria-hidden` (the text says the same thing).

## Kanban (`/projects/:projectId/kanban?boardId=…`)

- Shows the tasks of the board in the URL; new tasks are created on it.
  Without `boardId` (e.g. opened from a notification), all the project's
  tasks are shown. See [PROJECTS_AND_ACCESS.md](../backend/PROJECTS_AND_ACCESS.md#boards).
- Three columns (To Do, In Progress, Done), each with a status dot.
- Each column lists its tasks by priority: High first, then Medium, then
  Low, then tasks without a priority (`kanban/utils/sortByPriority.ts`).
- Drag and drop with optimistic update and rollback; keyboard alternative:
  every card opens the task dialog with Enter/Space, where the status can be
  changed (RGAA 7.3 / WCAG 2.5.7).
- VIEWER members get a read-only board.

### Task cards

`kanban/components/TaskCard.tsx`. Colours carry meaning, never alone:

| Element          | Colour                                   | Also conveyed by                     |
| ---------------- | ---------------------------------------- | ------------------------------------ |
| Priority         | Left stripe + badge: green / amber / red | Label and shape: ▼ Low, ● Medium, ▲ High |
| Deadline         | Red if overdue, amber if due within 2 days, neutral otherwise | Text: "Overdue · 28 Sep", "Due tomorrow", "Due 15 Oct"; overdue also has a solid outline |
| Assignee         | Avatar colour, stable per person         | Initials and name                    |

Done tasks are never shown as overdue (`kanban/utils/deadlineStatus.ts`).
Interactive cards are named "Open task …" and point `aria-describedby` at
their badges so screen readers still hear them.

## Colour-blind palette

Profile → **Accessibility** → *Colour-blind friendly*.

- Swaps every task and status colour for an Okabe-Ito based palette (blue /
  yellow / pink, which also differ in lightness) and adds patterns to the
  priority stripe (plain, dashed, hatched).
- Colours are CSS custom properties in `frontend/src/styles/index.css`
  (`--task-*`, `--status-*`), overridden under
  `:root[data-color-vision="colorblind"]`. **Use these variables for any new
  status/priority colour** so the palette keeps working.
- `shared/preferences/colorVision.ts`: stored per device in `localStorage`
  (`kanban.colorVision`), applied in `main.tsx` before the first render, so
  it also applies to the landing page.

## Notifications

Sidebar badge and `/notifications` page: see
[NOTIFICATIONS.md](../backend/NOTIFICATIONS.md#frontend).

## Known gaps

- The colour-vision setting is per device, not per account.
- Tasks without a board appear on no board (see
  [PROJECTS_AND_ACCESS.md](../backend/PROJECTS_AND_ACCESS.md#boards)).
- Unused files left from earlier iterations: `shared/components/WaitTemplate.tsx`,
  `shared/components/KanbanBoard.tsx`, `shared/components/LoginForm.tsx`
  (nothing imports them).
- The frontend unit tests are not run in CI (see
  [quality-gate.md](../quality-gate.md#3-coverage-threshold)).
