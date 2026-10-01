# Accessibility (RGAA) Standard

## 1. Purpose

This document explains what RGAA is, what this project currently does to follow it, and what a contributor must do to keep new frontend UI compliant. It targets someone joining the project with no prior accessibility background.

---

## 2. What RGAA is

RGAA (*Référentiel Général d'Amélioration de l'Accessibilité*) is the French government's accessibility reference framework. It adapts the international **WCAG 2.1** (Web Content Accessibility Guidelines) standard into 106 concrete test criteria, grouped into 13 themes (images, colors, forms, navigation, structure, scripts, etc.).

RGAA compliance is a **legal obligation** for French public-sector and some private-sector websites. This project is a school/portfolio exercise, not a public service, so there is no legal obligation here — but the team follows RGAA's criteria as good practice, because:

- it overlaps almost entirely with WCAG 2.1 AA, the de facto global standard;
- it gives a concrete, checkable list instead of a vague "be accessible" goal;
- accessibility work done now (semantic HTML, keyboard support, labelled forms) is far cheaper than retrofitting it later.

Reference: <https://accessibilite.numerique.gouv.fr/>

**Compliance levels**: RGAA criteria are rated A, AA, or AAA, same as WCAG. This project targets **AA**, the level virtually all real-world audits (including the legal one) require.

---

## 3. Current state: what this project does

This is a working baseline established by a code-level pass (branch `feat/rgaa`), not a certified, fully-audited RGAA report. A certified audit requires manual testing (contrast measurement tools, multiple screen readers, a keyboard-only pass, assistive-tech users) that hasn't been done. See [§6](#6-known-gaps--not-done) for what's explicitly not covered yet.

### 3.1 Mandatory elements (RGAA theme 8)

- `index.html` declares `lang="en"` (the UI's actual language) and a descriptive `<title>`.
- Every top-level page renders exactly one `<h1>` (its own, or inherited from a layout that already has one) — see [§4.3](#43-heading-hierarchy).

### 3.2 Navigation (theme 12)

- `MainLayout` renders a **skip link** ("Skip to main content") as the first focusable element, landing on `<main id="main-content">`. It's visually hidden until it receives keyboard focus (`frontend/src/app/layouts/MainLayout.tsx` / `.module.css`).
- The sidebar nav (`AppSidebar`) is wrapped in `<nav aria-label="Main navigation">`.
- Each kanban column is a `role="region"` landmark named after its title ("To Do column", etc.), so screen-reader users can jump between columns.

### 3.3 Forms (theme 11)

- Every text input must have a **programmatically associated label** — either reshaped's `FormControl` / `FormControl.Label` (see `LoginPage.tsx`, `RegisterPage.tsx`, the kanban task modal in `Board.tsx`), or a native `<label htmlFor={id}>` paired with a matching `id` via `useId()` (see `ProjectForm.tsx`, `BoardForm.tsx`). A `<Text>` sitting visually above a field is **not** a label — a screen reader has no way to connect the two.
- Validation/server errors are linked to their field with `aria-describedby` and surfaced with `aria-invalid` + `role="alert"`, not color alone.
- Groups of mutually-exclusive toggle buttons (e.g. the Priority/Status pickers in the task modal) are wrapped in `role="group"` with an `aria-label`, and each button carries `aria-pressed` — the selected state is not conveyed by color alone.
- reshaped `Select`: always pass native `<option>` children, never `Select.Option`. With `Select.Option`, reshaped renders a custom dropdown button that neither `FormControl.Label` nor `inputAttributes` can name (`inputAttributes` lands on a hidden `<input>`), so a screen reader only hears the selected value. With `<option>`, it renders a native `<select>` that is labelled correctly.

### 3.4 Dialogs (theme 7 / 12)

- Every modal uses reshaped's `Modal.Title` (not a plain `<Text>`) for its heading. `Modal.Title` registers itself so the dialog's `aria-labelledby` points at it — without this, a screen reader announces an unlabelled dialog. A plain `<Text>` styled to look like a title does **not** do this.
- Icon-only buttons (a `✕` close button, a lone `+`) always carry an explicit `aria-label` — their visible glyph is not a reliable accessible name.

> **Gotcha found while fixing this**: giving a modal a real `aria-labelledby` via `Modal.Title` can make an unrelated `getByRole("button", ...)` test query ambiguous. Reshaped's `Overlay` (the modal's backdrop) is itself `role="button"` with no label of its own; ARIA's "name from content" computation then recurses into the dialog, finds *its* `aria-labelledby`-derived name, and uses that as the overlay's name too — so the backdrop and the submit button can end up sharing the same accessible name. Fix the test, not the markup: scope the query with `within(screen.getByRole("dialog"))` rather than querying the whole document. See `Board.test.tsx` for an example.

### 3.5 Keyboard access and drag-and-drop (theme 7 / WCAG 2.5.7)

Native HTML5 drag-and-drop (used by the kanban board, via `react-dnd`) has **no built-in keyboard equivalent** — a mouse-only or switch-device user cannot drag a card between columns. WCAG 2.5.7 ("Dragging Movements") requires every drag interaction to have a non-drag alternative.

This project's alternative: every task card (`DraggableTaskCard`) is also a `role="button"`, focusable (`tabIndex={0}`), with `onKeyDown` handling <kbd>Enter</kbd>/<kbd>Space</kbd>, opening the same edit dialog a mouse click would. That dialog's **Status** picker (a `role="group"` of toggle buttons) lets a keyboard user move the task to another column without ever dragging anything. Dragging remains available for mouse users; it is not the only path to the same outcome.

If you add another drag-and-drop interaction anywhere in the app, it needs the same treatment: a focusable element, a keyboard handler, and a non-drag way to reach the same end state.

### 3.6 Decorative content (theme 1)

- Purely decorative icons/emoji (the 🏷️ priority tag, the 👤 assignee glyph, SVG nav icons) are wrapped in `<span aria-hidden="true">` or carry `aria-hidden="true"` directly, so a screen reader doesn't announce an ambiguous glyph name next to the real text that already conveys the information.
- An icon that *is* the only content of an interactive element (a button, a link) must instead get an `aria-label` on that element — hiding the icon without naming the control would leave it silent.
- To give screen readers text that isn't shown on screen (e.g. the unread-notification badge in `AppSidebar`), use the global `.sr-only` class (`frontend/src/styles/index.css`) and hide the visual-only version with `aria-hidden="true"`. Don't put `aria-label` on a plain `<span>`/`<div>`: ARIA forbids naming generic elements, and screen readers ignore it.

### 3.7 Focus visibility (theme 10 / 12)

- A global `:focus-visible` rule (`frontend/src/styles/index.css`) draws a visible outline on every keyboard-focused element. Don't override it with `outline: none` anywhere without providing an equally visible replacement.

---

## 4. Checklist for new UI

Before opening a PR that adds or changes frontend UI, check:

### 4.1 Forms

- [ ] Every input has a label connected via `FormControl.Label` or `<label htmlFor>` — never a bare `<Text>`/`<span>` sitting next to the field.
- [ ] Validation errors use `aria-invalid` + `aria-describedby` + `role="alert"`, not color alone.
- [ ] A group of toggle/choice buttons has `role="group"` + `aria-label`, and each option reflects its state via `aria-pressed` or `aria-checked` — not visual styling alone.

### 4.2 Interactive elements

- [ ] Every icon-only button/link has an `aria-label` describing what it does ("Close dialog", "Add task to {column}"), not what it looks like.
- [ ] Anything clickable that isn't a native `<button>`/`<a>` (a `<div onClick>`) is also keyboard-operable: `tabIndex={0}`, `role="button"` (or a more specific role), and an `onKeyDown` handling <kbd>Enter</kbd>/<kbd>Space</kbd>.
- [ ] Any drag-and-drop interaction has a non-drag alternative that reaches the same outcome.

### 4.3 Heading hierarchy

- [ ] Each top-level page has exactly one `<h1>` (reshaped: `<Text as="h1" ...>`), and nothing skips a level (no `<h3>` directly under an `<h1>` with no `<h2>` between, unless there's a genuine reason).
- [ ] A new page under `MainLayout` needs its own `<h1>` — the layout itself doesn't provide one.

### 4.4 Dialogs

- [ ] Use `Modal.Title` (and `Modal.Subtitle` if there's a subtitle), never a plain styled `<Text>`, so the dialog gets a real accessible name.
- [ ] If a test then needs to disambiguate a button whose name matches the title, scope the query with `within(screen.getByRole("dialog"))` instead of querying the document root (see [§3.4](#34-dialogs-theme-7--12)).

### 4.5 Images and icons

- [ ] A decorative icon/emoji sitting next to text that already says the same thing: `aria-hidden="true"`.
- [ ] An icon that's the *only* content of a control: `aria-label` on the control.
- [ ] Extra text meant only for screen readers: `.sr-only`, never `aria-label` on a `<span>`/`<div>` without a role.
- [ ] A meaningful image (not decorative, not duplicated by adjacent text): a real `alt` describing it.

### 4.6 Color and contrast

- [ ] Never use color as the only way to convey state (selected/error/success) — pair it with text, an icon, or an ARIA state attribute.
- [ ] If you introduce a new color pairing (new text/background combination), check it against at least 4.5:1 contrast (normal text) / 3:1 (large text) — e.g. with the browser's dev tools contrast checker. The automated audit ([§5](#5-automated-audit-and-why-it-isnt-enough)) checks default states only: check hover/focus/disabled states by hand.

---

## 5. Automated audit, and why it isn't enough

`frontend/e2e/accessibility.e2e.test.ts` runs axe-core (WCAG 2.1 A + AA rules) on every page of the running app, in the real theme, with test data it creates itself: login, register, 404, 403, projects, project details, kanban board, task dialog, my tasks, notifications, profile. It also checks that focus stays trapped in the task dialog and returns to the card when it closes.

```bash
# backend (API + Postgres) running, then from frontend/
npx playwright test e2e/accessibility.e2e.test.ts
# also print what needs a human eye: the accessibility tree of each page
# and a pixel-based contrast measurement for text over gradients
A11Y_REPORT=1 npx playwright test e2e/accessibility.e2e.test.ts
```

Run it before opening a PR that touches the UI. A new page should get its own test there.

Automated tools catch a meaningful slice of RGAA/WCAG criteria — missing labels, missing `alt`, invalid ARIA, contrast — but they cannot catch everything in this checklist: whether a keyboard alternative to a drag gesture actually reaches the same outcome, whether a heading hierarchy makes sense, whether an `aria-label` describes the right thing. Automated tooling is a floor, not a substitute for the checklist above.

---

## 6. Known gaps / not done

Being explicit about this so nobody mistakes "a pass was done" for "this is RGAA-certified":

- **Color contrast** of every page's default state is checked by the automated audit ([§5](#5-automated-audit-and-why-it-isnt-enough)), including text over gradients. Not covered: hover, focus and disabled states, error states not triggered by the test, and the admin dashboard (the audit has no admin user).
- **No screen-reader testing campaign** (NVDA, JAWS, VoiceOver) was performed. The accessibility tree each page exposes has been reviewed, but nobody has listened to how it actually sounds.
- **The automated audit doesn't run in CI**: e2e tests need the backend and a database, which the CI workflows don't start yet.
- **Known reshaped defects** (library code, not fixable from ours; worth reporting upstream):
  - The modal backdrop (`Overlay`) hardcodes `role="button"` around the whole dialog: a screen reader may announce a button wrapping the dialog (axe `nested-interactive`; the audit ignores only that exact node).
  - `FormControl.Helper` always renders `role="alert"`, so static help text (e.g. the email hint on the profile page) can be announced as an alert when it reappears.
  - `Modal.Title` renders an `<h6>`, which skips heading levels inside dialogs.
- **`frontend/src/app/legacy/**`** and **`backend/src/legacy/**`** are explicitly out of scope (same exclusion as the quality gate and SonarQube — see `docs/quality-gate.md`): pre-migration legacy code is not touched for this.
- The admin dashboard's and "My Tasks" page's tables are simple (no merged cells, one header row, `<th>` headings). Each one is named after its project via `aria-labelledby` (RGAA 5.4), set by `shared/utils/labelTable.ts`: reshaped's `Table` doesn't forward attributes to its `<table>`, and a `<caption>` child breaks its `<thead>`/`<tbody>` detection. Reuse that helper for any new table.
- This document itself has not been through a legal/compliance review — treat it as engineering guidance, not a certification deliverable.
