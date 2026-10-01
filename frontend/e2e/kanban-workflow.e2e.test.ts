import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";

const API = "/api/v1";

const runId = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

const user = {
  name: `E2E User ${runId}`,
  email: `e2e-${runId}@example.com`,
  password: "Password123!",
};

const projectName = `E2E Project ${runId}`;
const boardName = `E2E Board ${runId}`;
const taskTitle = `E2E Task ${runId}`;
const editedTaskTitle = `E2E Task edited ${runId}`;

type ColumnKey = "todo" | "in-progress" | "done";

const BACKEND_STATUS: Record<ColumnKey, string> = {
  todo: "TODO",
  "in-progress": "IN_PROGRESS",
  done: "DONE",
};

interface TaskResponse {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectId: string;
}

function column(page: Page, id: ColumnKey): Locator {
  return page.getByTestId(`column-${id}`);
}

function taskCard(page: Page, title: string): Locator {
  return page.locator("[data-task-id]").filter({ hasText: title });
}

/**
 * Runs `action` and waits for the matching API call, asserting the backend
 * answered with `expectedStatus`. Returns the parsed JSON body (undefined for
 * 204 No Content).
 */
async function expectApiCall<T>(
  page: Page,
  method: string,
  path: RegExp,
  expectedStatus: number,
  action: () => Promise<void>,
): Promise<T> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === method &&
      path.test(new URL(response.url()).pathname),
  );

  await action();

  const response = await responsePromise;
  expect(
    response.status(),
    `${method} ${new URL(response.url()).pathname} should return ${expectedStatus}`,
  ).toBe(expectedStatus);

  if (expectedStatus === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Reads the task straight from the backend (uses the browser's auth cookies). */
async function fetchTaskFromBackend(
  page: Page,
  projectId: string,
  taskId: string,
): Promise<TaskResponse> {
  const response = await page.request.get(`${API}/projects/${projectId}/tasks`);
  expect(response.status()).toBe(200);

  const tasks = (await response.json()) as TaskResponse[];
  const task = tasks.find((t) => t.id === taskId);
  expect(task, `task ${taskId} should exist in the backend`).toBeDefined();

  return task as TaskResponse;
}

/** Fills the login form, submits it and checks the user lands on /projects. */
async function logIn(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login$/);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);

  const body = await expectApiCall<{
    user: { email: string; name: string };
  }>(page, "POST", /\/auth\/login$/, 200, () =>
    page.getByRole("button", { name: "Sign in" }).click(),
  );
  expect(body.user).toMatchObject({ email: user.email, name: user.name });

  await expect(page).toHaveURL(/\/projects$/);
  await expect(
    page.getByText("No projects yet", { exact: true }),
  ).toBeVisible();

  // The session cookie must now authenticate API calls.
  const me = await page.request.get(`${API}/auth/me`);
  expect(me.status()).toBe(200);
}

async function expectTaskOnlyIn(
  page: Page,
  title: string,
  target: ColumnKey,
): Promise<void> {
  for (const id of ["todo", "in-progress", "done"] as const) {
    await expect(
      column(page, id).locator("[data-task-id]").filter({ hasText: title }),
    ).toHaveCount(id === target ? 1 : 0);
  }
}

async function dragTaskAndVerify(
  page: Page,
  title: string,
  projectId: string,
  taskId: string,
  target: ColumnKey,
): Promise<void> {
  const updated = await expectApiCall<TaskResponse>(
    page,
    "PATCH",
    new RegExp(`/tasks/${taskId}$`),
    200,
    () => taskCard(page, title).dragTo(column(page, target)),
  );
  expect(updated.status).toBe(BACKEND_STATUS[target]);

  // The pending lock is released once the move is persisted and refetched.
  await expect(taskCard(page, title)).toHaveAttribute("aria-busy", "false");
  await expectTaskOnlyIn(page, title, target);

  const stored = await fetchTaskFromBackend(page, projectId, taskId);
  expect(stored.status).toBe(BACKEND_STATUS[target]);
}

/**
 * The flow is split into one test per step so a failure points straight at
 * the step that broke. Tests run serially and share one browser page (and so
 * one logged-in session); if a step fails, the following ones are skipped.
 */
test.describe.configure({ mode: "serial" });

// Playwright's per-test tracing breaks on a context shared across tests, so
// one trace covering the whole flow is recorded manually instead.
test.use({ trace: "off" });

test.describe("Kanban end-to-end flow", () => {
  let context: BrowserContext;
  let page: Page;
  let hasFailure = false;

  let projectId = "";
  let boardId = "";
  let taskId = "";

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    await context.tracing.start({ screenshots: true, snapshots: true });
    page = await context.newPage();
  });

  // eslint-disable-next-line no-empty-pattern -- Playwright requires an object pattern here
  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      hasFailure = true;
    }
  });

  // eslint-disable-next-line no-empty-pattern -- Playwright requires an object pattern here
  test.afterAll(async ({}, testInfo) => {
    // Keep the trace only when a step failed (open with `npx playwright show-trace`).
    await context.tracing.stop(
      hasFailure
        ? { path: testInfo.outputPath("kanban-workflow-trace.zip") }
        : undefined,
    );
    await context.close();
  });

  test.describe("1. Authentication", () => {
    test("register a new user", async () => {
      await page.goto("/register");
      await expect(page.getByText("Create your account")).toBeVisible();

      await page.locator('input[name="name"]').fill(user.name);
      await page.locator('input[name="email"]').fill(user.email);
      await page.locator('input[name="password"]').fill(user.password);
      await page.locator('input[name="confirmPassword"]').fill(user.password);

      const body = await expectApiCall<{
        user: { id: string; email: string; name: string };
      }>(page, "POST", /\/auth\/register$/, 201, () =>
        page.getByRole("button", { name: "Create account" }).click(),
      );
      expect(body.user).toMatchObject({ email: user.email, name: user.name });
      expect(body.user.id).toBeTruthy();

      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByText("Your account has been created. You can now sign in."),
      ).toBeVisible();
    });

    test("log in with the new user", async () => {
      await logIn(page);
    });

    test("log out", async () => {
      await expectApiCall(page, "POST", /\/auth\/logout$/, 200, () =>
        page.getByRole("button", { name: "Log out" }).click(),
      );

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

      // The session cookies are cleared: the API rejects the user...
      const me = await page.request.get(`${API}/auth/me`);
      expect(me.status()).toBe(401);

      // ...and protected pages redirect back to the login page.
      await page.goto("/projects");
      await expect(page).toHaveURL(/\/login$/);
    });

    test("log back in with the same credentials", async () => {
      await logIn(page);
    });
  });

  test.describe("2. Project and board", () => {
    test("create a project", async () => {
      await page.getByRole("button", { name: "+ New Project" }).click();
      await page.getByLabel("Project name").fill(projectName);
      await page.getByLabel("Description").fill("Created by the E2E test");

      const project = await expectApiCall<{
        id: string;
        name: string;
        description: string;
      }>(page, "POST", /\/projects$/, 201, () =>
        page.getByRole("button", { name: "Create project" }).click(),
      );
      expect(project).toMatchObject({
        name: projectName,
        description: "Created by the E2E test",
      });
      projectId = project.id;

      await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
      await expect(
        page.getByRole("heading", { level: 1, name: projectName }),
      ).toBeVisible();
      await expect(page.getByText("No boards yet.")).toBeVisible();
    });

    test("create a board", async () => {
      await page.getByRole("button", { name: "+ New board" }).click();
      await page.getByLabel("Board name").fill(boardName);

      const board = await expectApiCall<{
        id: string;
        name: string;
        projectId: string;
      }>(page, "POST", new RegExp(`/projects/${projectId}/boards$`), 201, () =>
        page.getByRole("button", { name: "Create board" }).click(),
      );
      expect(board).toMatchObject({ name: boardName, projectId });
      boardId = board.id;

      await expect(
        page.getByRole("link", { name: `Open board ${boardName}` }),
      ).toBeVisible();
      await expect(page.getByText("1 board", { exact: true })).toBeVisible();
    });

    test("open the board", async () => {
      await page.getByRole("link", { name: `Open board ${boardName}` }).click();

      await expect(page).toHaveURL(
        new RegExp(`/projects/${projectId}/kanban\\?boardId=${boardId}$`),
      );
      // The Kanban is titled after the board it shows.
      await expect(
        page.getByRole("heading", { level: 1, name: boardName }),
      ).toBeVisible();
    });
  });

  test.describe("3. Task creation and edition", () => {
    test("create a task", async () => {
      await page.getByRole("button", { name: "+ Add Task" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Create Task").first()).toBeVisible();

      await dialog.locator('input[name="title"]').fill(taskTitle);
      await dialog
        .locator('textarea[name="description"]')
        .fill("Task created by the E2E test");
      await dialog.getByRole("button", { name: "High" }).click();

      const task = await expectApiCall<TaskResponse>(
        page,
        "POST",
        new RegExp(`/projects/${projectId}/tasks$`),
        201,
        () => dialog.getByRole("button", { name: "Create Task" }).click(),
      );
      expect(task).toMatchObject({
        title: taskTitle,
        description: "Task created by the E2E test",
        priority: "High",
        status: "TODO",
        projectId,
      });
      taskId = task.id;

      await expect(dialog).toBeHidden();
      await expectTaskOnlyIn(page, taskTitle, "todo");
      await expect(taskCard(page, taskTitle)).toContainText("High");
      await expect(column(page, "todo")).toContainText("(1)");
    });

    test("edit the task", async () => {
      await taskCard(page, taskTitle).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Edit Task")).toBeVisible();
      await expect(dialog.locator('input[name="title"]')).toHaveValue(
        taskTitle,
      );

      await dialog.locator('input[name="title"]').fill(editedTaskTitle);
      await dialog
        .locator('textarea[name="description"]')
        .fill("Task edited by the E2E test");
      await dialog.getByRole("button", { name: "Low" }).click();

      const updated = await expectApiCall<TaskResponse>(
        page,
        "PATCH",
        new RegExp(`/tasks/${taskId}$`),
        200,
        () => dialog.getByRole("button", { name: "Save Changes" }).click(),
      );
      expect(updated).toMatchObject({
        id: taskId,
        title: editedTaskTitle,
        description: "Task edited by the E2E test",
        priority: "Low",
        status: "TODO",
      });

      await expect(dialog).toBeHidden();
      await expect(taskCard(page, taskTitle)).toHaveCount(0);
      await expectTaskOnlyIn(page, editedTaskTitle, "todo");
      await expect(taskCard(page, editedTaskTitle)).toContainText("Low");

      const stored = await fetchTaskFromBackend(page, projectId, taskId);
      expect(stored).toMatchObject({
        title: editedTaskTitle,
        description: "Task edited by the E2E test",
        priority: "Low",
      });
    });
  });

  test.describe("4. Drag and drop", () => {
    test("move the task To Do → In Progress", async () => {
      await dragTaskAndVerify(
        page,
        editedTaskTitle,
        projectId,
        taskId,
        "in-progress",
      );
      await expect(column(page, "todo")).toContainText("(0)");
      await expect(column(page, "in-progress")).toContainText("(1)");
    });

    test("move persists after a reload", async () => {
      await page.reload();
      await expectTaskOnlyIn(page, editedTaskTitle, "in-progress");
    });

    test("move the task In Progress → Done", async () => {
      await dragTaskAndVerify(page, editedTaskTitle, projectId, taskId, "done");
    });

    test("move the task Done → To Do", async () => {
      await dragTaskAndVerify(page, editedTaskTitle, projectId, taskId, "todo");
    });

    test("final state persists after a reload", async () => {
      await page.reload();
      await expectTaskOnlyIn(page, editedTaskTitle, "todo");
      await expect(taskCard(page, editedTaskTitle)).toContainText("Low");

      const stored = await fetchTaskFromBackend(page, projectId, taskId);
      expect(stored).toMatchObject({
        title: editedTaskTitle,
        priority: "Low",
        status: "TODO",
      });
    });
  });

  test.describe("5. Cleanup", () => {
    test("delete the task", async () => {
      await taskCard(page, editedTaskTitle).click();

      const editDialog = page.getByRole("dialog");
      await expect(editDialog.getByText("Edit Task")).toBeVisible();
      await editDialog.getByRole("button", { name: "Delete Task" }).click();

      const confirmDialog = page
        .getByRole("dialog")
        .filter({ hasText: "This action cannot be undone." });
      await expect(confirmDialog).toContainText(editedTaskTitle);

      await expectApiCall(
        page,
        "DELETE",
        new RegExp(`/tasks/${taskId}$`),
        204,
        () =>
          confirmDialog.getByRole("button", { name: "Confirm Delete" }).click(),
      );

      // With no task left, the board replaces its columns with an empty state.
      await expect(taskCard(page, editedTaskTitle)).toHaveCount(0);
      await expect(
        page.getByText("No tasks yet", { exact: true }),
      ).toBeVisible();

      // Both modals close at once; rather than asserting on modal DOM (Reshaped
      // may keep it briefly while animating out), check the board is usable
      // again: a trial click fails if anything still covers the button.
      await page
        .getByRole("button", { name: "+ Add Task" })
        .click({ trial: true });

      const response = await page.request.get(
        `${API}/projects/${projectId}/tasks`,
      );
      expect(response.status()).toBe(200);
      const tasks = (await response.json()) as TaskResponse[];
      expect(tasks.find((t) => t.id === taskId)).toBeUndefined();
    });

    test("delete the board", async () => {
      await page.goto(`/projects/${projectId}`);
      await expect(
        page.getByRole("link", { name: `Open board ${boardName}` }),
      ).toBeVisible();

      await page.getByRole("button", { name: `Delete ${boardName}` }).click();

      const confirm = page.getByRole("group", {
        name: `Delete board ${boardName}`,
      });
      await expect(confirm).toBeVisible();

      await expectApiCall(
        page,
        "DELETE",
        new RegExp(`/boards/${boardId}$`),
        204,
        () =>
          confirm
            .getByRole("button", { name: "Confirm board deletion" })
            .click(),
      );

      await expect(
        page.getByRole("link", { name: `Open board ${boardName}` }),
      ).toHaveCount(0);
      await expect(page.getByText("No boards yet.")).toBeVisible();

      const response = await page.request.get(
        `${API}/projects/${projectId}/boards`,
      );
      expect(response.status()).toBe(200);
      const boards = (await response.json()) as { id: string }[];
      expect(boards.find((b) => b.id === boardId)).toBeUndefined();
    });

    test("delete the project", async () => {
      await page.getByRole("button", { name: "Delete project" }).click();

      const confirm = page.getByRole("group", {
        name: `Delete project ${projectName}`,
      });
      await expect(confirm).toBeVisible();

      await expectApiCall(
        page,
        "DELETE",
        new RegExp(`/projects/${projectId}$`),
        204,
        () => page.getByRole("button", { name: "Confirm deletion" }).click(),
      );

      await expect(page).toHaveURL(/\/projects$/);
      await expect(
        page.getByText("No projects yet", { exact: true }),
      ).toBeVisible();

      const response = await page.request.get(`${API}/projects/${projectId}`);
      expect(response.status()).toBe(404);
    });
  });
});
