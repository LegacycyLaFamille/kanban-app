# Frontend Testing Guide

This guide explains how the frontend is tested, how to run the tests, and how
to write new ones.

Related documents:
[`docs/standards/TESTING_CONVENTIONS.md`](../standards/TESTING_CONVENTIONS.md)
(project-wide rules),
[`docs/backend/Get_started.md`](../backend/Get_started.md) (running the
backend, needed for E2E tests),
[`docs/frontend/FEATURES.md`](FEATURES.md) (what each page does),
[`docs/standards/ACCESSIBILITY_RGAA.md`](../standards/ACCESSIBILITY_RGAA.md#5-automated-audit-and-why-it-isnt-enough)
(the accessibility E2E audit).

## 1. Overview

The frontend has two test levels:

| Level            | Tool                           | Location                       | Backend needed? | Speed      |
| ---------------- | ------------------------------ | ------------------------------ | --------------- | ---------- |
| Unit / component | Vitest + React Testing Library | `frontend/src/**/*.test.ts(x)` | No (mocked)     | Seconds    |
| End-to-end (E2E) | Playwright (Chromium)          | `frontend/e2e/*.e2e.test.ts`   | **Yes** (real)  | ~6 seconds |

- **Unit tests** check a single hook, API function, or component in
  isolation, in a simulated browser (jsdom). Network calls are mocked.
- **E2E tests** drive the real app in a real browser, against the real
  backend and database, exactly like a user would.

## 2. Quick start

All commands are run from the `frontend/` folder.

```bash
cd frontend
npm install                      # first time only
npx playwright install chromium  # first time only (downloads the E2E browser)
```

### Unit tests

```bash
npm test                  # run all unit tests once
npx vitest                # watch mode: re-runs on file change
npx vitest src/features/kanban        # only one folder
npx vitest -t "redirects to projects" # only tests whose name matches
npm run test:coverage     # with coverage report (frontend/coverage/index.html)
```

### E2E tests

1. **Start the backend** (API on `http://localhost:3000` and PostgreSQL). See
   [`docs/backend/Get_started.md`](../backend/Get_started.md). In short:

   ```bash
   cd backend
   docker compose up -d   # PostgreSQL
   npm run dev            # API on :3000
   ```

2. **Run the tests** from `frontend/`:

   ```bash
   npm run test:e2e              # headless, prints one line per step
   npx playwright test --headed  # opens a browser window so you can watch
   npm run test:e2e:ui           # interactive UI: timeline, DOM snapshots, network
   npx playwright show-report    # HTML report of the last run
   ```

The Vite dev server (`http://localhost:5173`) is started automatically if it
is not already running. If it is already running, it is reused.

To target another environment (for example the Docker stack on port 8080),
set `E2E_BASE_URL`. The dev server is then not started:

```bash
E2E_BASE_URL=http://localhost:8080 npm run test:e2e
```

The E2E folder holds two suites:

| File                                | What it checks                                              |
| ----------------------------------- | ----------------------------------------------------------- |
| `e2e/kanban-workflow.e2e.test.ts`   | The main user journey, step by step (§4.1)                  |
| `e2e/accessibility.e2e.test.ts`     | axe-core WCAG 2.1 AA audit of every page, including the landing page and the colour-blind palette, plus keyboard focus in the task dialog |

Run only one of them with `npx playwright test e2e/accessibility.e2e.test.ts`.

## 3. How the unit tests work

Configuration: `frontend/vitest.config.ts`.

- Environment: **jsdom** (a browser simulated in Node).
- Files matched: `src/**/*.test.{ts,tsx}`, placed **next to the file they
  test** (`LoginPage.tsx` → `LoginPage.test.tsx`).
- `src/test/setupTests.ts` runs before every file. It cleans up the DOM after
  each test and mocks browser APIs missing in jsdom (`matchMedia`,
  `ResizeObserver`), which Reshaped needs.
- `import.meta.env.VITE_API_URL` is set to `/api/v1`.

Common patterns in the codebase:

| What you test    | How                                                                                          | Example                                  |
| ---------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------- |
| API function     | `vi.spyOn(httpClient, "get")` and assert the URL / payload                                   | `features/kanban/api/tasks.api.test.ts`  |
| Hook             | `renderHook` from Testing Library, mock its dependencies with `vi.mock`                      | `features/auth/hooks/useLogin.test.ts`   |
| Page / component | `vi.mock` the hook, render inside `<Reshaped>` + `<MemoryRouter>`, interact with `userEvent` | `features/auth/pages/LoginPage.test.tsx` |

## 4. How the E2E tests work

Configuration: `frontend/playwright.config.ts`. Tests:
`frontend/e2e/*.e2e.test.ts`.

### 4.1 The Kanban workflow test

`e2e/kanban-workflow.e2e.test.ts` covers the critical user workflow, split
into **15 small tests grouped in 5 sections**:

```text
1. Authentication         register a new user → log in
2. Project and board      create a project → create a board → open the board
3. Task creation/edition  create a task → edit the task
4. Drag and drop          To Do → In Progress → (reload) → Done → To Do → (reload)
5. Cleanup                delete the task → delete the board → delete the project
```

Each step checks **three things**:

1. **The UI**: the right page, text, and card position are visible.
2. **The API response**: the step waits for the real HTTP call and checks
   its status code (`201`, `200`, `204`…) and returned body.
3. **The stored state**: after a change, the test reads it back from the API
   (for example `GET /projects/:id/tasks`) to confirm it was saved.

### 4.2 Why the steps depend on each other

The tests run **serially** (`test.describe.configure({ mode: "serial" })`) and
**share one browser page**, created in `beforeAll`. The user logs in once,
and the IDs created along the way (`projectId`, `boardId`, `taskId`) are
stored in variables used by the next steps.

Consequences:

- If a step fails, **the following steps are skipped** (shown as `-`). The
  failure is always the first `x` in the output.
- You **cannot run one step alone** (for example with `-g "delete the board"`),
  because it needs the previous steps. Always run the whole file.
- Each run uses unique names (`E2E User <timestamp>`, `e2e-<timestamp>@example.com`…),
  so runs never collide and the test can be re-run immediately.

### 4.3 Test data

The test uses the database of the backend it runs against, so **never run it
against production**.

- The project, board, and task are deleted by the "5. Cleanup" steps.
- The **test user is not deleted**, so each run leaves one `e2e-…@example.com`
  user behind.
- If a step fails before "5. Cleanup", that run's project, board, and task
  also stay in the database.

### 4.4 Helpers

Defined at the top of `kanban-workflow.e2e.test.ts`:

| Helper                                                      | Purpose                                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expectApiCall(page, method, path, status, action)`         | Runs `action` (for example a click), waits for the matching API call, asserts its status code, and returns the JSON body (`undefined` for `204`). |
| `fetchTaskFromBackend(page, projectId, taskId)`             | Reads a task directly from the API, with the browser's login cookies.                                                                             |
| `column(page, "todo" \| "in-progress" \| "done")`           | Locates a Kanban column (uses `data-testid="column-<id>"` in `Column.tsx`).                                                                       |
| `taskCard(page, title)`                                     | Locates a task card by its title.                                                                                                                 |
| `expectTaskOnlyIn(page, title, column)`                     | Asserts the card is in that column and in no other.                                                                                               |
| `dragTaskAndVerify(page, title, projectId, taskId, column)` | Drags the card, checks the `PATCH` response, the UI, and the stored status.                                                                       |

### 4.5 Reading a failure

```text
  ok   9  › 4. Drag and drop › move persists after a reload
  x   10  › 4. Drag and drop › move the task In Progress → Done
  -   11  › 4. Drag and drop › move the task Done → To Do
    Expected: "DONE"
    Received: "TODO"
    attachment: screenshot → test-results\...\test-failed-1.png
```

- `x` is the step that failed, with its file line.
- `Expected` / `Received` show what went wrong. A message like
  `PATCH /api/v1/tasks/… should return 200` means **the backend** returned
  an unexpected status code.
- In `frontend/test-results/<failed step>/` you get:
  - `test-failed-1.png`: a screenshot of the page when the step failed;
  - `error-context.md`: the error and a text snapshot of the page;
  - `kanban-workflow-trace.zip`: a trace of the **whole run**, recorded by
    the test itself (automatic per-test tracing is off for this file because
    it does not work with a shared page). Replay every action, DOM snapshot,
    and network call with
    `npx playwright show-trace test-results/<failed step>/kanban-workflow-trace.zip`.
- `npx playwright show-report` shows everything in the browser.

Self-contained E2E files (see §5.3) use the config defaults instead: a
screenshot, a video, and a `trace.zip` are kept for each failed test.

## 5. Writing tests

### 5.1 Writing a unit test

Create `<File>.test.tsx` next to the file under test:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Reshaped } from "reshaped";

import { BoardForm } from "./BoardForm";

describe("BoardForm", () => {
  it("shows an error when the name is empty", async () => {
    const onSubmit = vi.fn();

    render(
      <Reshaped theme="slate">
        <BoardForm
          title="Create board"
          submitLabel="Create board"
          isSubmitting={false}
          serverError={null}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      </Reshaped>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Create board" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "Board name is required.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

Rules:

- Test behavior the user can see, not implementation details.
- Prefer accessible selectors: `getByRole`, `getByLabelText`, `getByText`.
- Mock the layer just below the one you test (component → hook, hook → API
  module, API module → `httpClient`).
- Wrap components in `<Reshaped>` and, if they use routing, `<MemoryRouter>`.

### 5.2 Adding a step to the existing E2E workflow

Add a `test(...)` in the right section of `kanban-workflow.e2e.test.ts`. It
continues from where the previous step left off (same page, same user):

```ts
test("rename the board", async () => {
  await page.getByRole("button", { name: `Rename ${boardName}` }).click();
  await page.getByLabel("Board name").fill(`${boardName} v2`);

  const board = await expectApiCall<{ name: string }>(
    page,
    "PATCH",
    new RegExp(`/boards/${boardId}$`),
    200,
    () => page.getByRole("button", { name: "Save changes" }).click(),
  );
  expect(board.name).toBe(`${boardName} v2`);

  await expect(
    page.getByRole("link", { name: `Open board ${boardName} v2` }),
  ).toBeVisible();
});
```

### 5.3 Creating a new E2E file

Create `frontend/e2e/<workflow>.e2e.test.ts` (the `.e2e.test.ts` suffix is
required, it is what Playwright looks for). Use the simple form when the
test is self-contained. Each test then gets a fresh browser:

```ts
import { expect, test } from "@playwright/test";

test("shows an error for invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("nobody@example.com");
  await page.locator('input[name="password"]').fill("wrong-password");

  const response = page.waitForResponse("**/auth/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await response).status()).toBe(401);

  await expect(page.getByRole("alert")).toBeVisible();
});
```

Use the serial + shared page pattern of `kanban-workflow.e2e.test.ts` only
for a multi-step workflow where each step builds on the previous one. To reuse
the helpers in several files, move them to `frontend/e2e/helpers.ts`.

### 5.4 E2E best practices

- **Always wait on something observable**: an API response
  (`expectApiCall`), or a web-first assertion (`await expect(...).toBeVisible()`,
  `toHaveURL`, `toHaveCount`). Never use `page.waitForTimeout`.
- **Check the backend, not only the UI**: assert the response status and
  body, and read the data back when the change must be saved.
- **Selectors**, from best to worst: role + name (`getByRole("button", { name: "Save" })`),
  label (`getByLabel`), visible text, `name` attribute
  (`input[name="email"]`), and last `data-testid`. Add a `data-testid` in the
  component only when nothing accessible is available (as for the Kanban
  columns).
- **Use unique data** (built from `runId`) so runs never collide.
- **Clean up** what the test creates.

## 6. Troubleshooting

| Symptom                                                                     | Likely cause / fix                                                                             |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `register a new user` fails, `POST /auth/register` returns 500 or times out | The backend or PostgreSQL is not running. Start them (see §2).                                 |
| `Executable doesn't exist … chromium`                                       | Run `npx playwright install chromium`. Or use an installed Edge/Chrome without downloading: add `channel: "msedge"` (or `"chrome"`) to the project's `use` in a local copy of the config. |
| `Timed out waiting … http://localhost:5173`                                 | The dev server could not start. Run `npm run dev` manually to see the error.                   |
| Only the first step fails, and all others are `-`                           | Normal: later steps are skipped after a failure. Fix the first `x`.                            |
| A drag-and-drop step fails intermittently                                   | Open the trace. Make sure the step waits for the `PATCH` response and for `aria-busy="false"`. |
| `delete the task` times out: `… subtree intercepts pointer events`          | Known app bug, see §6.1.                                                                       |

### 6.1 Known issues

- **Board blocked after deleting a task (intermittent, about 3 runs in 10).**
  After confirming the deletion, an invisible Reshaped modal overlay can stay
  on top of the board and block every click until the page is reloaded.
  `Board.tsx` (`handleDelete`) closes the edit modal and the delete
  confirmation modal in the same update. The `delete the task` step detects
  this with a trial click on "+ Add Task", so this step fails intermittently
  until the bug is fixed.

## 7. CI status

- **Unit tests**: run locally with `npm test`. Lint, format, and type-check
  (which also covers `e2e/` and `playwright.config.ts`) run in CI
  (`.github/workflows/lint.yml`).
- **E2E tests**: **not in CI yet**. They need a running backend and database.
  Run them locally before opening a Pull Request that touches the auth,
  project, board, or Kanban flows.
