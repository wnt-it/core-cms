// Release von core-cms: `npm run release` (nur prüfen: `npm run release -- --dry-run`).
//
// Einzige Quelle ist der oberste Eintrag in src/admin/changelog.ts. Ohne neuen Eintrag
// gibt es keinen Release. Das Skript setzt die Version in package.json, committet,
// pusht nach dev und legt Tag und GitHub-Release auf diesen Commit.
//
// Es kann nach einem Fehler (z. B. GitHub nicht erreichbar) einfach erneut laufen.

import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dirname, "..");
const BRANCH = "dev";
const dryRun = process.argv.includes("--dry-run");

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
const fail = (messages) => {
  console.error(`\nRelease abgebrochen:\n${messages.map((m) => `  - ${m}`).join("\n")}`);
  process.exit(1);
};
const parseVersion = (v) => v.split(".").map(Number);
const isNewer = (a, b) => {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

// 1. Changelog lesen (Node führt die TypeScript-Datei direkt aus)
const { CORE_CHANGELOG } = await import(pathToFileURL(join(ROOT, "src/admin/changelog.ts")).href);
const entry = CORE_CHANGELOG[0];
const { version } = entry;
const tag = `v${version}`;

// 2. Alles prüfen und alle Probleme zusammen melden
const errors = [];
if (!/^\d+\.\d+\.\d+$/.test(version)) errors.push(`Ungültige Version im Changelog: "${version}"`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date ?? "")) errors.push(`Ungültiges Datum im Changelog: "${entry.date}"`);
if (!entry.changes?.length || entry.changes.some((c) => !c.text?.trim())) errors.push("Der Changelog-Eintrag hat keinen Text.");

git("fetch", "--tags", "origin", BRANCH);
const tags = git("tag", "--list", "v*").split("\n").filter(Boolean).map((t) => t.slice(1));
const latest = tags.filter((t) => /^\d+\.\d+\.\d+$/.test(t)).sort((a, b) => (isNewer(a, b) ? -1 : 1))[0];
if (tags.includes(version)) errors.push(`${tag} gibt es schon. Bitte oben in src/admin/changelog.ts den Eintrag für die neue Version ergänzen.`);
else if (latest && !isNewer(version, latest)) errors.push(`${tag} ist nicht neuer als der letzte Release v${latest}.`);

if (git("branch", "--show-current") !== BRANCH) errors.push(`Release nur vom Branch ${BRANCH}.`);
if (git("rev-list", "--count", `HEAD..origin/${BRANCH}`) !== "0") errors.push(`origin/${BRANCH} enthält neuere Commits. Bitte zuerst abgleichen.`);

// Der Release committet nur diese Dateien. Offener Code käme sonst nicht mit und ginge unbemerkt verloren.
const RELEASE_FILES = ["src/admin/changelog.ts", "src/admin/core-version.ts", "package.json", "package-lock.json"];
const CODE = /^(src|sql|scripts)\/|^(next-config\.mjs|tsconfig\.json)$/;
const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .map((line) => line.slice(3).replace(/^"|"$/g, ""));
const open = dirty.filter((f) => !RELEASE_FILES.includes(f));
const openCode = open.filter((f) => CODE.test(f));
if (openCode.length) errors.push(`Noch nicht committeter Code: ${openCode.join(", ")}`);

if (errors.length) fail(errors);

const others = open.filter((f) => !CODE.test(f));
if (others.length) console.log(`Hinweis: Diese Dateien gehören nicht zum Release und bleiben unverändert: ${others.join(", ")}`);

// 3. Typprüfung
console.log("Typprüfung ...");
try {
  execSync("npm run --silent typecheck", { cwd: ROOT, stdio: "inherit" });
} catch {
  fail(["Die Typprüfung ist fehlgeschlagen."]);
}

// 4. Release-Notes aus dem Eintrag
const SECTIONS = [["Sicherheit", "security"], ["Features", "feature"], ["Fixes", "fix"], ["Docs", "docs"]];
const notes = [
  ...(entry.releaseNotes?.trim() ? [entry.releaseNotes.trim()] : []),
  ...SECTIONS.flatMap(([title, type]) => {
    const items = entry.changes.filter((c) => c.type === type);
    return items.length ? [`## ${title}\n${items.map((c) => `- ${c.text}`).join("\n")}`] : [];
  }),
].join("\n\n");

console.log(`\nRelease ${tag} (zuletzt v${latest ?? "-"})\n\n${notes}\n`);
if (dryRun) {
  console.log("Testlauf: Alle Prüfungen bestanden, nichts geändert.");
  process.exit(0);
}

// 5. Version setzen, committen, pushen
const setVersion = (file, count) => {
  const path = join(ROOT, file);
  let left = count;
  const next = readFileSync(path, "utf8").replace(/"version": "[^"]*"/g, (m) => (left-- > 0 ? `"version": "${version}"` : m));
  writeFileSync(path, next);
};
setVersion("package.json", 1);
// In der Lockfile steht die eigene Version zweimal ganz oben
setVersion("package-lock.json", 2);
// Version für AdminShell und Einwilligungsprotokoll, ohne den Changelog zu laden
{
  const path = join(ROOT, "src/admin/core-version.ts");
  writeFileSync(path, readFileSync(path, "utf8").replace(/CORE_VERSION = "[^"]*"/, `CORE_VERSION = "${version}"`));
}

git("add", "--", ...RELEASE_FILES);
if (git("diff", "--cached", "--name-only")) git("commit", "-m", `chore: Release ${tag}`);

try {
  git("push", "origin", BRANCH);
} catch {
  fail([`Push nach ${BRANCH} fehlgeschlagen. Es wurde kein Tag angelegt, der Befehl kann einfach erneut laufen.`]);
}

// 6. Tag und GitHub-Release
const sha = git("rev-parse", "HEAD");
const dir = mkdtempSync(join(tmpdir(), "core-cms-release-"));
const notesFile = join(dir, "notes.md");
writeFileSync(notesFile, notes);
try {
  execSync(`gh release create ${tag} --target ${sha} --title ${tag} --notes-file "${notesFile}"`, { cwd: ROOT, stdio: "inherit" });
} catch {
  fail([`GitHub-Release fehlgeschlagen. ${tag} ist noch nicht angelegt, der Befehl kann einfach erneut laufen.`]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// 7. Prüfen, ob der Tag wirklich auf dem Commit liegt
git("fetch", "--tags", "origin");
if (git("rev-list", "-n", "1", tag) !== sha) fail([`${tag} zeigt nicht auf den Release-Commit ${sha}.`]);

console.log(`\nFertig: ${tag} auf ${sha.slice(0, 7)}. Rollout: scripts\\update-core-cms.ps1 -Version ${tag} -Projects <projekt>`);
