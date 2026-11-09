import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error reines JavaScript ohne Typen
import { CORE_ONLY_ADMIN_SLUGS, RETIRED_ADMIN_SLUGS, findBrandingOverrides, findCoreRouteConflicts, withCoreCms } from "../../next-config.mjs";
import { coreAdminNav, RETIRED_ADMIN_PATHS } from "../../src/admin/core-nav";
import { CORE_VERSION } from "../../src/admin/core-version";

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

  it("sperrt die alte Posteingang-Adresse /admin/submissions", () => {
    const root = projekt(["src/app/admin/(dashboard)/submissions/page.tsx"]);
    expect(findCoreRouteConflicts(root).map((c: { slug: string }) => c.slug)).toEqual(["submissions"]);
  });

  it("leitet alte Adressen vor den Umleitungen des Projekts um", async () => {
    const root = projekt([]);
    const cwd = process.cwd();
    process.chdir(root);
    try {
      const config = withCoreCms({ redirects: async () => [{ source: "/alt", destination: "/neu", permanent: true }] });
      const list = await config.redirects();
      expect(list[0]).toMatchObject({ source: "/admin/submissions", destination: "/admin/posteingang" });
      expect(list.at(-1)).toMatchObject({ source: "/alt" });
    } finally {
      process.chdir(cwd);
    }
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
    const slugs = coreAdminNav.map((p) => p.slug);
    const erwartet = slugs.filter((s) => s !== "datenschutz" && s !== "impressum").sort();
    expect([...CORE_ONLY_ADMIN_SLUGS].sort()).toEqual(erwartet);
    expect(RETIRED_ADMIN_PATHS).toEqual(RETIRED_ADMIN_SLUGS);
  });

  it("jede Menüseite hat eine Komponente in core-pages.tsx", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../src/admin/core-pages.tsx"), "utf8");
    const block = src.slice(src.indexOf("const COMPONENTS"), src.indexOf("};", src.indexOf("const COMPONENTS")));
    for (const { slug } of coreAdminNav) expect(block).toMatch(new RegExp(`^\\s+${slug}:`, "m"));
  });

  it("AdminShell lädt keine Server-Seiten und keinen Changelog", () => {
    const shell = fs.readFileSync(path.join(__dirname, "../../src/ui/AdminShell.tsx"), "utf8");
    expect(shell).not.toMatch(/from "\.\.\/admin\/(core-pages|changelog)"/);
  });

  it("Favicon-Sperre: nur echte icons-Metadaten, keine Symbol-Listen", () => {
    const root = projekt([]);
    const write = (f: string, text: string) => {
      fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
      fs.writeFileSync(path.join(root, f), text);
    };
    write("src/app/leistungen/page.tsx", "const icons = [Star, Heart]\nconst data = { icons: [1] }\nexport default function P() { return null }");
    write("src/app/layout.tsx", 'export const metadata = { title: "X", icons: { icon: "/x.png" } }');
    const found = findBrandingOverrides(root).map((c: { file: string }) => c.file.replace(/\\/g, "/"));
    expect(found).toEqual(["src/app/layout.tsx"]);
  });

  it("changelog.ts hat keine Imports (Release-Skript liest die Datei direkt mit Node)", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../src/admin/changelog.ts"), "utf8");
    expect(src).not.toMatch(/^\s*(import|export\s+(\*|\{[^}]*\})\s+from)\s/m);
  });

  it("Core-Version passt zu package.json", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8"));
    expect(CORE_VERSION).toBe(pkg.version);
  });
});
