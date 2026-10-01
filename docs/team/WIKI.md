# Documentation and the GitHub Wiki

The documentation exists in two places that must stay identical:

| Where | Role |
| --- | --- |
| `docs/` (+ `README.md`, `README.fr.md`, `frontend/README.md`) | **Source of truth.** Written and reviewed in pull requests, versioned with the code. |
| [GitHub Wiki](https://github.com/LegacycyLaFamille/kanban-app/wiki) | **Published copy**, easier to browse: sidebar, one page per document, French and English side by side. |

**Always edit `docs/`, never the wiki.** Every generated wiki page starts
with a "Generated from …" notice, and is overwritten on the next publish.

## How it is published

`scripts/sync-wiki.mjs` turns the documentation into wiki pages:

- one page per Markdown file, in the wiki's flat namespace:
  `docs/backend/NOTIFICATIONS.md` → `NOTIFICATIONS`, French versions get a
  `-FR` suffix (`ONBOARDING-FR`), folder indexes become `ADR-Index` and
  `Standards-Index`, the root README becomes `Home` (`Accueil` in French);
- links between documents become wiki links (anchors kept), links to any
  other repository file become GitHub links to the published branch;
- `_Sidebar.md` (navigation grouped by topic, with an FR link next to each
  translated page) and `_Footer.md` (source commit) are generated;
- the script writes a `.generated-pages` manifest in the wiki. On the next
  run it only removes pages listed there whose source no longer exists:
  **pages created by hand in the wiki are never touched**.

The **Publish Wiki** workflow (`.github/workflows/wiki.yml`) runs it on every
push to `main` that touches the documentation, and can be started by hand
from the Actions tab. Links then point to `main`.

## Publishing by hand

```bash
git clone https://github.com/LegacycyLaFamille/kanban-app.wiki.git ../kanban-app.wiki
node scripts/sync-wiki.mjs ../kanban-app.wiki main
cd ../kanban-app.wiki
git add -A && git commit -m "docs: sync wiki" && git push
```

Run the script without pushing to preview: the clone then holds exactly
what the wiki would show.

## Adding a document

1. Add the Markdown file under `docs/` (and its `.fr.md` translation where
   the folder is bilingual).
2. Link it from the right index (`README.md`, a folder `README.md`).
3. Use relative links (`../backend/EVENTS.md#section`): they work on GitHub
   and are converted for the wiki.
4. Two documents must not share a file name (except `README`): the script
   stops with an error, since wiki page names are global.

Once merged into `main`, the page appears in the wiki and its sidebar.

## If the workflow cannot push

The workflow pushes with the default `GITHUB_TOKEN` (`contents: write`). If
the organization restricts it, create a fine-grained token with *Contents:
read and write* on this repository, store it as the `WIKI_TOKEN` secret, and
pass `token: ${{ secrets.WIKI_TOKEN }}` to the "Check out the wiki" step.
