import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error reines JavaScript ohne Typen
import { CORE_ONLY_ADMIN_SLUGS, findCoreRouteConflicts, withCoreCms } from "../../next-config.mjs";

const tmp: string[] = [];
function projekt(files: string[]) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "core-routes-"));
  tmp.push(root);
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.writeFileSync(path.join(root, f), "export default function P() { return null }");
  }
  return root;
}
afterEach(() => {
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("Core-Seiten nur aus dem Core", () => {
  it("findet eigene Einstellungsseiten, auch in Routengruppen", () => {
    const root = projekt([
      "src/app/admin/(dashboard)/einstellungen/page.tsx",
      "src/app/(admin)/admin/(dashboard)/popup/page.tsx",
    ]);
    const slugs = findCoreRouteConflicts(root).map((c: { slug: string }) => c.slug).sort();
    expect(slugs).toEqual(["einstellungen", "popup"]);
  });

  it("erlaubt Catch-all, Datenschutz/Impressum, Unterseiten und andere Adressen", () => {
    const root = projekt([
      "src/app/admin/(dashboard)/[...core]/page.tsx",
      "src/app/admin/(dashboard)/datenschutz/page.tsx",
      "src/app/admin/(dashboard)/impressum/page.tsx",
      "src/app/admin/(dashboard)/einstellungen/actions.ts",
      "src/app/admin/(dashboard)/kopfbilder/page.tsx",
      "src/app/einstellungen/page.tsx",
    ]);
    expect(findCoreRouteConflicts(root)).toEqual([]);
  });

  it("withCoreCms bricht mit Hinweis ab", () => {
    const root = projekt(["app/admin/einstellungen/page.tsx"]);
    const cwd = process.cwd();
    process.chdir(root);
    try {
      expect(() => withCoreCms({})).toThrow(/einstellungen/);
    } finally {
      process.chdir(cwd);
    }
  });

  it("Liste passt zu coreAdminPages (alle außer Datenschutz und Impressum)", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../src/admin/core-pages.tsx"), "utf8");
    const slugs = [...src.matchAll(/\{ slug: "([^"]+)"/g)].map((m) => m[1]);
    const erwartet = slugs.filter((s) => s !== "datenschutz" && s !== "impressum").sort();
    expect([...CORE_ONLY_ADMIN_SLUGS].sort()).toEqual(erwartet);
  });
});
