// The page.evaluate() callbacks below run in the browser.
/// <reference lib="dom" />

import { AxeBuilder } from "@axe-core/playwright";
import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

/**
 * Automated RGAA / WCAG 2.1 AA audit of every page (see
 * docs/standards/ACCESSIBILITY_RGAA.md). axe-core checks the rendered DOM in
 * the real theme, including color contrast, so it catches what unit tests
 * can't. It is a floor, not a full audit: manual keyboard and screen-reader
 * checks are still needed.
 *
 * Each test also attaches the page's accessibility tree (what a screen
 * reader receives) to the report, for manual review.
 */

const API = "/api/v1";
const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const runId = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
const password = "Password123!";
const owner = {
  name: `A11y Owner ${runId}`,
  email: `a11y-owner-${runId}@example.com`,
};
const inviter = {
  name: `A11y Inviter ${runId}`,
  email: `a11y-inviter-${runId}@example.com`,
};

async function registerAndLogIn(
  api: APIRequestContext,
  user: { name: string; email: string },
): Promise<string> {
  const registered = await api.post(`${API}/auth/register`, {
    data: { ...user, password },
  });
  expect(registered.status()).toBe(201);

  const loggedIn = await api.post(`${API}/auth/login`, {
    data: { email: user.email, password },
  });
  expect(loggedIn.status()).toBe(200);

  const body = (await loggedIn.json()) as { user: { id: string } };
  return body.user.id;
}

async function post<T>(
  api: APIRequestContext,
  path: string,
  data: object,
): Promise<T> {
  const response = await api.post(`${API}${path}`, { data });
  expect(response.status(), `POST ${path}`).toBe(201);
  return (await response.json()) as T;
}

/**
 * Known library defect, not fixable from our code: reshaped's Overlay (the
 * modal backdrop) hardcodes role="button" tabIndex={-1} on the element that
 * wraps the whole dialog, after the attributes we pass in, so axe reports
 * nested-interactive. Only that exact node is ignored; any other nested
 * interactive control still fails. See ACCESSIBILITY_RGAA.md §6.
 */
async function isReshapedModalOverlay(
  page: Page,
  selector: string,
): Promise<boolean> {
  const element = page.locator(selector);
  return (
    (await element.getAttribute("role")) === "button" &&
    (await element.locator("[role=dialog]").count()) > 0
  );
}

/**
 * axe can't compute contrast over a gradient background. This measures it:
 * screenshot the box of each text run with the text made transparent, then
 * compare the text color with every background pixel and keep the worst
 * ratio. Returns null when there is no plain-colored text to measure.
 */
async function measureGradientContrast(
  page: Page,
  selector: string,
): Promise<{ ratio: number; required: number; color: string } | null> {
  const element = page.locator(selector).first();

  // One entry per visible text run: its box, color and size. Gradient-filled
  // text is skipped.
  const runs = await element.evaluate((root) => {
    const found: {
      rect: { x: number; y: number; width: number; height: number };
      color: string;
      large: boolean;
    }[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const parent = text.parentElement;
      if (!parent || !text.textContent?.trim()) continue;
      const style = getComputedStyle(parent);
      if (style.backgroundClip === "text") continue;
      const range = document.createRange();
      range.selectNodeContents(text);
      const box = range.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;
      const size = parseFloat(style.fontSize);
      found.push({
        rect: {
          x: box.x + window.scrollX,
          y: box.y + window.scrollY,
          width: box.width,
          height: box.height,
        },
        color: style.color,
        large: size >= 24 || (Number(style.fontWeight) >= 700 && size >= 18.66),
      });
    }
    for (const node of [root, ...root.querySelectorAll("*")] as HTMLElement[]) {
      node.style.setProperty("color", "transparent", "important");
      node.style.setProperty("text-shadow", "none", "important");
      node.style.setProperty("transition", "none", "important");
    }
    return found;
  });

  const shots = [];
  for (const run of runs) {
    const shot = await page.screenshot({ clip: run.rect, fullPage: true });
    shots.push(shot.toString("base64"));
  }
  await element.evaluate((root) => {
    for (const node of [root, ...root.querySelectorAll("*")] as HTMLElement[]) {
      node.style.removeProperty("color");
      node.style.removeProperty("text-shadow");
      node.style.removeProperty("transition");
    }
  });
  if (runs.length === 0) return null;

  const ratios = await page.evaluate(
    async ({ runs, shots }) => {
      const luminance = ([r, g, b]: number[]) => {
        const [R, G, B] = [r, g, b].map((v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * R + 0.7152 * G + 0.0722 * B;
      };
      // Let the browser resolve any CSS color (oklch, rgba...) to sRGB.
      const toRgba = (color: string) => {
        const context = new OffscreenCanvas(1, 1).getContext("2d")!;
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
        return [r, g, b, a / 255];
      };

      const result = [];
      for (const [index, run] of runs.entries()) {
        const image = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${shots[index]}`)).blob(),
        );
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const { data } = context.getImageData(0, 0, image.width, image.height);
        const [r, g, b, a] = toRgba(run.color);

        let worst = Infinity;
        for (let i = 0; i < data.length; i += 4) {
          const bg = [data[i], data[i + 1], data[i + 2]];
          const fg = [r, g, b].map((v, k) => v * a + bg[k] * (1 - a));
          const [l1, l2] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
          worst = Math.min(worst, (l1 + 0.05) / (l2 + 0.05));
        }
        result.push(worst);
      }
      return result;
    },
    { runs, shots },
  );

  // Report the run that is furthest below (or closest to) its threshold.
  let worstIndex = 0;
  ratios.forEach((ratio, index) => {
    const required = runs[index].large ? 3 : 4.5;
    const worstRequired = runs[worstIndex].large ? 3 : 4.5;
    if (ratio / required < ratios[worstIndex] / worstRequired)
      worstIndex = index;
  });
  return {
    ratio: ratios[worstIndex],
    required: runs[worstIndex].large ? 3 : 4.5,
    color: runs[worstIndex].color,
  };
}

async function audit(page: Page): Promise<void> {
  const testInfo = test.info();
  await testInfo.attach("accessibility-tree.yml", {
    body: await page.locator("body").ariaSnapshot(),
    contentType: "text/yaml",
  });

  const results = await new AxeBuilder({ page })
    .withTags(WCAG_AA_TAGS)
    .analyze();

  await testInfo.attach("axe-violations.json", {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  // A11Y_REPORT=1 prints what still needs a human eye: checks axe could not
  // decide (e.g. text over a gradient) and the accessibility tree.
  if (process.env.A11Y_REPORT) {
    console.log(`\n===== ${testInfo.title}`);
    for (const item of results.incomplete) {
      console.log(`[needs review] ${item.id}: ${item.nodes.length} node(s)`);
      for (const node of item.nodes) {
        const data = node.any[0]?.data as { messageKey?: string } | undefined;
        let measured = "";
        if (item.id === "color-contrast" && data?.messageKey === "bgGradient") {
          const result = await measureGradientContrast(
            page,
            node.target.join(" "),
          );
          measured = result
            ? `${result.ratio < result.required ? "FAIL" : "ok"} ${result.ratio.toFixed(2)}:1 (needs ${result.required}) ${result.color}`
            : "gradient text, check by eye";
        }
        console.log(
          `    ${node.html.slice(0, 70)} :: ${data?.messageKey ?? ""} ${measured}`,
        );
      }
    }
    console.log(await page.locator("body").ariaSnapshot());
  }

  const violations = [];
  for (const violation of results.violations) {
    const nodes = [];
    for (const node of violation.nodes) {
      if (
        violation.id === "nested-interactive" &&
        (await isReshapedModalOverlay(page, node.target.join(" ")))
      ) {
        continue;
      }
      nodes.push(node);
    }
    if (nodes.length > 0) violations.push({ ...violation, nodes });
  }

  const summary = violations.map(
    (violation) =>
      `[${violation.impact}] ${violation.id}: ${violation.help}\n` +
      violation.nodes
        .map(
          (node) =>
            `    ${node.target.join(" ")}\n      ${node.failureSummary?.replaceAll("\n", "\n      ")}`,
        )
        .join("\n"),
  );

  expect(summary, summary.join("\n\n")).toEqual([]);
}

// Not serial: one page's violations must not skip the audit of the others.
test.use({ trace: "off" });

test.describe("Accessibility (axe, WCAG 2.1 AA)", () => {
  let context: BrowserContext;
  let page: Page;
  let projectId = "";
  let boardId = "";
  const taskTitle = `A11y Task ${runId}`;

  test.beforeAll(async ({ browser, baseURL }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // The owner's session lives in the browser context's cookie jar.
    const ownerId = await registerAndLogIn(context.request, owner);
    const project = await post<{ id: string }>(context.request, "/projects", {
      name: `A11y Project ${runId}`,
      description: "Created by the accessibility audit",
    });
    projectId = project.id;
    const board = await post<{ id: string }>(
      context.request,
      `/projects/${projectId}/boards`,
      { name: `A11y Board ${runId}` },
    );
    boardId = board.id;
    await post(context.request, `/projects/${projectId}/tasks`, {
      title: taskTitle,
      description: "Audit task",
      priority: "High",
      boardId,
      assigneeId: ownerId,
    });

    // A second user invites the owner, so the pending-invitations card shows.
    const inviterApi = await playwrightRequest.newContext({ baseURL });
    await registerAndLogIn(inviterApi, inviter);
    const otherProject = await post<{ id: string }>(inviterApi, "/projects", {
      name: `A11y Shared ${runId}`,
    });
    await post(inviterApi, `/projects/${otherProject.id}/invitations`, {
      email: owner.email,
      role: "EDITOR",
    });
    await inviterApi.dispose();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("login page", async ({ browser }) => {
    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    await guest.goto("/login");
    await expect(guest.getByRole("heading", { level: 1 })).toBeVisible();
    await audit(guest);
    await guestContext.close();
  });

  test("register page", async ({ browser }) => {
    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    await guest.goto("/register");
    await expect(guest.getByRole("heading", { level: 1 })).toBeVisible();
    await audit(guest);
    await guestContext.close();
  });

  test("404 page", async ({ browser }) => {
    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    await guest.goto("/this-page-does-not-exist");
    await expect(guest.getByRole("heading", { level: 1 })).toBeVisible();
    await audit(guest);
    await guestContext.close();
  });

  test("403 page", async ({ browser }) => {
    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    await guest.goto("/403");
    await expect(guest.getByRole("heading", { level: 1 })).toBeVisible();
    await audit(guest);
    await guestContext.close();
  });

  test("projects page", async () => {
    await page.goto("/projects");
    await expect(page.getByText(`A11y Project ${runId}`)).toBeVisible();
    await expect(page.getByText(/Project invitations/)).toBeVisible();
    await audit(page);
  });

  test("project details page", async () => {
    await page.goto(`/projects/${projectId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Project members" }),
    ).toBeVisible();
    await audit(page);
  });

  test("kanban board", async () => {
    await page.goto(`/projects/${projectId}/kanban?boardId=${boardId}`);
    await expect(page.getByText(taskTitle)).toBeVisible();
    await audit(page);
  });

  test("kanban task dialog", async () => {
    await page.goto(`/projects/${projectId}/kanban?boardId=${boardId}`);
    await page.getByRole("button", { name: `Open task ${taskTitle}` }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Let the open animation finish: mid-fade colors are false contrast hits.
    await dialog.evaluate((element) =>
      Promise.all(
        element.getAnimations({ subtree: true }).map((a) => a.finished),
      ),
    );
    await audit(page);
    await page.keyboard.press("Escape");
  });

  // axe flags the page behind the open dialog (aria-hidden but focusable) as
  // "needs review": that's only fine if focus can't leave the dialog.
  test("kanban task dialog is keyboard operable", async () => {
    await page.goto(`/projects/${projectId}/kanban?boardId=${boardId}`);
    const card = page.getByRole("button", { name: `Open task ${taskTitle}` });
    await card.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const insideDialog = await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      );
      expect(insideDialog, `focus left the dialog after ${i + 1} Tab`).toBe(
        true,
      );
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(
      card,
      "focus returns to the card that opened it",
    ).toBeFocused();
  });

  test("my tasks page", async () => {
    await page.goto("/tasks");
    await expect(page.getByText(taskTitle)).toBeVisible();
    await audit(page);
  });

  test("notifications page", async () => {
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Loading notifications")).toHaveCount(0);
    await audit(page);
  });

  test("profile page", async () => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await audit(page);
  });
});
