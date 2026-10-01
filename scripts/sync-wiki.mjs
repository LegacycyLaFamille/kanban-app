#!/usr/bin/env node
// Publishes the repository documentation to the GitHub wiki.
//
// docs/ stays the source of truth: this script copies its Markdown files
// (plus the root and frontend READMEs) into a clone of the wiki repository,
// with names and links adapted to the wiki. Pages created by hand in the
// wiki are left alone: only pages listed in the previous run's manifest are
// ever removed.
//
// Usage:
//   git clone https://github.com/LegacycyLaFamille/kanban-app.wiki.git ../wiki
//   node scripts/sync-wiki.mjs ../wiki [branch]
//   cd ../wiki && git add -A && git commit -m "docs: sync wiki" && git push
//
// `branch` (default: main) is the branch that links to source files point to.
// See docs/team/WIKI.md.

import { execSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_URL = "https://github.com/LegacycyLaFamille/kanban-app";
const MANIFEST = ".generated-pages";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [wikiDirArg, branch = "main"] = process.argv.slice(2);

if (!wikiDirArg) {
  console.error("Usage: node scripts/sync-wiki.mjs <wiki-clone-dir> [branch]");
  process.exit(1);
}
const wikiDir = resolve(wikiDirArg);
if (!existsSync(join(wikiDir, ".git"))) {
  console.error(`${wikiDir} is not a git clone of the wiki.`);
  process.exit(1);
}

// ---------------------------------------------------------------- sources

function listMarkdown(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = posix.join(dir, entry.name);
      if (entry.isDirectory()) return listMarkdown(path);
      return entry.name.endsWith(".md") ? [path] : [];
    },
  );
}

const sources = [
  "README.md",
  "README.fr.md",
  "frontend/README.md",
  ...listMarkdown("docs"),
];

// Wiki pages live in one flat namespace, so names must be unique.
function pageName(path) {
  if (path === "README.md") return "Home";
  if (path === "README.fr.md") return "Accueil";
  if (path === "frontend/README.md") return "Frontend-README";

  const french = path.endsWith(".fr.md");
  let name = basename(path).replace(/(\.fr)?\.md$/, "");
  if (name === "README") {
    const folder = basename(dirname(path));
    name = `${folder === "adr" ? "ADR" : capitalize(folder)}-Index`;
  }
  return french ? `${name}-FR` : name;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const pages = new Map(); // source path -> page name
for (const path of sources) {
  const name = pageName(path);
  const clash = [...pages].find(([, other]) => other === name);
  if (clash) {
    console.error(`Page name "${name}" used by ${clash[0]} and ${path}.`);
    process.exit(1);
  }
  pages.set(path, name);
}

// ------------------------------------------------------------------ links

function sourceUrl(path) {
  const kind = statSync(join(root, path)).isDirectory() ? "tree" : "blob";
  return `${REPO_URL}/${kind}/${branch}/${path.split(" ").join("%20")}`;
}

// Relative links become wiki page links when they point to a published
// document, GitHub links when they point to any other repository file.
function rewriteLink(target, from) {
  if (/^([a-z]+:|#|\/\/)/i.test(target)) return target;

  const [rawPath, anchor] = target.split("#");
  const path = posix.normalize(posix.join(posix.dirname(from), rawPath));
  const suffix = anchor === undefined ? "" : `#${anchor}`;

  if (pages.has(path)) return `${pages.get(path)}${suffix}`;
  if (existsSync(join(root, path))) return `${sourceUrl(path)}${suffix}`;

  console.warn(`  ${from}: broken link "${target}" left as is`);
  return target;
}

function convert(markdown, from) {
  // Links inside fenced code blocks are examples, not links. Inline code is
  // not skipped: it is often the text of a link ([`file.md`](file.md)).
  return markdown
    .split(/(```[\s\S]*?```)/)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replace(
            /(!?\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g,
            (_, open, target, close) =>
              `${open}${rewriteLink(target, from)}${close}`,
          ),
    )
    .join("");
}

function banner(path) {
  const french = path.endsWith(".fr.md");
  return french
    ? `> Page générée depuis [\`${path}\`](${sourceUrl(path)}). ` +
        "Modifiez ce fichier dans le dépôt : les modifications faites ici " +
        "seront écrasées à la prochaine publication.\n\n"
    : `> Generated from [\`${path}\`](${sourceUrl(path)}). ` +
        "Edit that file in the repository: changes made here are " +
        "overwritten on the next publish.\n\n";
}

// ---------------------------------------------------------------- sidebar

// The first heading, H1 preferably (some documents start at H2).
function title(path) {
  const text = readFileSync(join(root, path), "utf8");
  const heading = text.match(/^#\s+(.+)$/m) ?? text.match(/^#{2,6}\s+(.+)$/m);
  return heading ? heading[1].replace(/[`*]/g, "").trim() : pages.get(path);
}

function entry(path) {
  const fr = path.replace(/\.md$/, ".fr.md");
  const french = pages.has(fr) ? ` · [FR](${pages.get(fr)})` : "";
  return `- [${title(path)}](${pages.get(path)})${french}`;
}

function englishIn(dir) {
  return sources
    .filter((p) => p.startsWith(`${dir}/`) && !p.endsWith(".fr.md"))
    .filter((p) => !p.endsWith("TEMPLATE.md"))
    // The folder's index first, then its documents.
    .sort((a, b) => Number(b.endsWith("README.md")) - Number(a.endsWith("README.md")) || a.localeCompare(b));
}

function sidebar() {
  const sections = [
    ["Start", ["README.md", "docs/team/ONBOARDING.md", "docs/backend/Get_started.md", "frontend/README.md"]],
    ["Architecture", ["docs/architecture/FRONTEND_MIGRATION.md", "docs/architecture/BACKEND_MIGRATION.md"]],
    ["Decisions (ADR)", englishIn("docs/adr")],
    ["Backend", englishIn("docs/backend").filter((p) => p !== "docs/backend/Get_started.md")],
    ["Frontend", englishIn("docs/frontend")],
    ["Standards", englishIn("docs/standards")],
    ["Quality", ["docs/quality-gate.md", ...englishIn("docs/benchmarks")]],
    ["Audit", englishIn("docs/audit")],
  ];
  const listed = new Set(sections.flatMap(([, paths]) => paths));
  const others = sources.filter(
    (p) => !listed.has(p) && !p.endsWith(".fr.md") && pages.has(p),
  );
  if (others.length) sections.push(["Other", others]);

  return (
    sections
      .map(([name, paths]) =>
        [`**${name}**`, "", ...paths.filter((p) => pages.has(p)).map(entry)].join("\n"),
      )
      .join("\n\n") + "\n"
  );
}

// ------------------------------------------------------------------ write

const previous = existsSync(join(wikiDir, MANIFEST))
  ? readFileSync(join(wikiDir, MANIFEST), "utf8").split("\n").filter(Boolean)
  : [];

const written = [];
for (const [path, name] of pages) {
  const markdown = readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
  writeFileSync(join(wikiDir, `${name}.md`), banner(path) + convert(markdown, path));
  written.push(`${name}.md`);
}

let commit = "unknown";
try {
  commit = execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim();
} catch {
  // Not a git checkout: the footer just says "unknown".
}

writeFileSync(join(wikiDir, "_Sidebar.md"), sidebar());
writeFileSync(
  join(wikiDir, "_Footer.md"),
  `Generated from [\`docs/\`](${REPO_URL}/tree/${branch}/docs) at ` +
    `[\`${commit}\`](${REPO_URL}/commit/${commit}) by \`scripts/sync-wiki.mjs\`. ` +
    "Edit the repository, not the wiki.\n",
);
written.push("_Sidebar.md", "_Footer.md");

// Remove pages this script published before but whose source is gone.
for (const file of previous) {
  if (!written.includes(file) && existsSync(join(wikiDir, file))) {
    rmSync(join(wikiDir, file));
    console.log(`  removed ${file}`);
  }
}
writeFileSync(join(wikiDir, MANIFEST), written.sort().join("\n") + "\n");

console.log(
  `Wrote ${written.length} pages to ${relative(process.cwd(), wikiDir) || "."} (links to ${branch}).`,
);
