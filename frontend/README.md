# Kanban App — Frontend

React 19 + TypeScript + Vite, UI built on [Reshaped](https://reshaped.so/)
([ADR-009](../docs/adr/ADR-009-reshaped-ui.md)), organized by feature
([ADR-004](../docs/adr/ADR-004-feature-based-frontend.md)).

## Run it

The frontend talks to the backend API. Start the backend first
([docs/backend/Get_started.md](../docs/backend/Get_started.md)), then:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api` to
`http://localhost:3000`. To call another API, set `VITE_API_URL`
(default `/api/v1`).

| Script                            | What it does                                                               |
| --------------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`                     | Dev server with hot reload                                                 |
| `npm run build`                   | Type-check and production build (`dist/`)                                  |
| `npm run preview`                 | Serve the production build                                                 |
| `npm run lint`                    | ESLint                                                                     |
| `npm run format` / `format:check` | Prettier                                                                   |
| `npm run typecheck`               | `tsc -b --noEmit`                                                          |
| `npm test`                        | Unit tests (Vitest + React Testing Library)                                |
| `npm run test:coverage`           | Unit tests with coverage (`coverage/`)                                     |
| `npm run test:e2e`                | Playwright E2E: Kanban workflow and accessibility audit (backend required) |

CI runs lint, format check and type-check on every pull request. Run the
tests yourself before opening one: they are not in CI yet
([quality-gate.md](../docs/quality-gate.md)).

## Where things are

```text
src/
├── app/            router, providers, layouts (sidebar)
├── features/       one folder per feature: api/, hooks/, components/, pages/, types/
│   ├── landing/    landing page on /
│   ├── auth/       session, login/register, route guards
│   ├── projects/   projects, boards, members, invitations
│   ├── kanban/     board, columns, task cards, drag and drop
│   ├── tasks/      My Tasks
│   ├── notifications/
│   ├── profile/    profile, accessibility settings, data export
│   ├── admin/      admin dashboard
│   └── errors/     403 / 404
├── shared/         api/ (httpClient), components/, preferences/, utils/
└── styles/         global styles and colour tokens (index.css)
```

Rules worth knowing before writing code:

- All HTTP calls go through `shared/api/httpClient` (it refreshes the session
  on a 401), from a feature's `api/` folder.
- Status and priority colours are CSS variables (`--task-*`, `--status-*` in
  `styles/index.css`); never hard-code them, the colour-blind palette
  depends on it.
- New UI must follow the RGAA checklist, and a new page needs a test in
  `e2e/accessibility.e2e.test.ts`.

## Documentation

- [docs/frontend/FEATURES.md](../docs/frontend/FEATURES.md) — routes and what each feature does
- [docs/frontend/TESTING.md](../docs/frontend/TESTING.md) — writing and running tests
- [docs/standards/ACCESSIBILITY_RGAA.md](../docs/standards/ACCESSIBILITY_RGAA.md) — accessibility rules
- [docs/architecture/FRONTEND_MIGRATION.md](../docs/architecture/FRONTEND_MIGRATION.md) — migration strategy and current state
- [docs/standards/](../docs/standards/README.md) — naming, Git, code quality, testing conventions
