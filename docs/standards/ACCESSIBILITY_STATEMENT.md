# Accessibility statement — DRAFT

> **Draft, not published.** This document follows the structure of the
> [official RGAA 4.1 accessibility statement template](https://accessibilite.numerique.gouv.fr/obligations/declaration-accessibilite/).
> It describes the real state of the project on 2026-10-01. The `[To fill in]`
> fields must be completed before publishing. The published version should
> be the French one ([ACCESSIBILITY_STATEMENT.fr.md](ACCESSIBILITY_STATEMENT.fr.md)),
> since RGAA is a French framework. This project is a school exercise and is
> not legally required to publish one (see
> [ACCESSIBILITY_RGAA.md](ACCESSIBILITY_RGAA.md#2-what-rgaa-is)); it is
> written as good practice.

[To fill in: entity name] is committed to making its websites accessible in
accordance with article 47 of French law no. 2005-102 of 11 February 2005.

This accessibility statement applies to **Kanban App**
([To fill in: production URL]).

## Compliance status

**Kanban App is not compliant** with RGAA 4.1.

No full compliance audit (all 106 criteria, on a sample of pages) has been
carried out yet. Without valid audit results, RGAA requires the site to be
declared non-compliant, even though accessibility work is in place (see
below).

## Test results

No full audit yet, so no compliance rate.

What has been done (details in [ACCESSIBILITY_RGAA.md](ACCESSIBILITY_RGAA.md)):

- automated axe-core audit (WCAG 2.1 A and AA rules) of every page,
  including with the colour-blind palette: no violation on 2026-10-01;
- code review against the project's RGAA checklist (forms, headings,
  dialogs, keyboard, alternatives to drag and drop, colour, motion).

## Non-accessible content

### Known non-compliance

- The dialog backdrop (the Reshaped library's `Overlay` component) carries a
  `role="button"` that wraps the dialog (criterion 7.1).
- Dialog titles are `<h6>` elements, which skips heading levels
  (criterion 9.1).
- Form help texts (Reshaped's `FormControl.Helper`) carry `role="alert"` and
  can be announced as alerts (criterion 7.5).

### Not verified

- Screen-reader output (NVDA, JAWS, VoiceOver).
- Display at 320 px wide and at 200% / 400% zoom (criterion 10.11), text
  spacing overrides (criterion 10.12).
- Contrast of hover, focus and disabled states (criterion 3.2).
- The admin dashboard.

### Content exempt from the accessibility requirement

None: the former TodoList application has been removed.

## Preparation of this statement

This statement was prepared on [To fill in: publication date].

### Technologies used

HTML5, CSS, JavaScript (React, TypeScript), WAI-ARIA.

### Test environment

Automated audit with Microsoft Edge and Chromium (Playwright). No
screen-reader testing so far.

### Tools used

- axe-core through `@axe-core/playwright` (`frontend/e2e/accessibility.e2e.test.ts`)
- Playwright's accessibility tree (`A11Y_REPORT=1`)
- Pixel-based contrast measurement for text over gradients (same test)

### Pages checked

Home (`/`), sign in, sign up, 403 page, 404 page, projects list, project
details, Kanban board, task edit dialog, my tasks, notifications, profile.

## Accommodations

- Colour-blind friendly palette: Profile → Accessibility.
- "Pause animations" button on the home page, and no animation at all when
  the system asks for reduced motion (`prefers-reduced-motion`).
- Every Kanban drag-and-drop action can also be done with the keyboard
  (Enter on a card, then pick the status).

## Feedback and contact

If you cannot access some content or a service, contact
[To fill in: email address or contact form] to be directed to an accessible
alternative or to get the content in another form.

## Remedies

If you reported an accessibility defect that prevents you from accessing
content or a service and did not get a satisfactory answer, you can:

- write to the [Défenseur des droits](https://formulaire.defenseurdesdroits.fr/);
- contact [the Défenseur des droits delegate in your region](https://www.defenseurdesdroits.fr/saisir/delegues);
- send a letter by post (free, no stamp needed): Défenseur des droits,
  Libre réponse 71120, 75342 Paris CEDEX 07.

## Before publishing

1. Have a full audit carried out on a representative sample of pages and
   replace the "Compliance status" and "Test results" sections with the
   resulting rate.
2. Fill in the `[To fill in]` fields.
3. Publish the statement in the app and add, in the home page footer, the
   mention "Accessibility: not / partially / fully compliant" linking to it.
4. Update the statement after every new audit.
