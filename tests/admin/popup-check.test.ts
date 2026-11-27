// withCoreCms: Projekte mit Admin müssen das Pop-up über <SitePopupHost /> einbinden.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error reines JavaScript ohne Typen
import { findPopupIntegration, withCoreCms } from "../../next-config.mjs";

const tmp: string[] = [];
function projekt(files: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "core-popup-"));
  tmp.push(root);
  for (const [f, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.writeFileSync(path.join(root, f), text);
  }
  return root;
}
afterEach(() => {
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const ADMIN = { "src/app/admin/(dashboard)/page.tsx": "export default function P() { return null }" };
const HOST = 'import { SitePopupHost } from "core-cms/src/popup";\nexport default function L({ children }) { return <>{children}<SitePopupHost /></>; }';

describe("findPopupIntegration", () => {
  it("findet SitePopupHost im Layout, auch in Routengruppen", () => {
    const r = findPopupIntegration(projekt({ ...ADMIN, "src/app/(site)/layout.tsx": HOST }));
    expect(r.hasAdmin).toBe(true);
    expect(r.hosts).toEqual([path.join("src", "app", "(site)", "layout.tsx")]);
    expect(r.singles).toEqual([]);
  });

  it("erkennt Admin in einer Routengruppe", () => {
    expect(findPopupIntegration(projekt({ "src/app/(admin)/admin/page.tsx": "x" })).hasAdmin).toBe(true);
    expect(findPopupIntegration(projekt({ "src/app/page.tsx": "x" })).hasAdmin).toBe(false);
  });

  it("meldet alte Einbindung auf einzelnen Seiten, ignoriert Kommentare und den Admin", () => {
    const r = findPopupIntegration(
      projekt({
        ...ADMIN,
        "src/app/page.tsx": "const p = await getSitePopup();\nreturn <>{p && <SitePopup {...p} />}</>;",
        "src/app/layout.tsx": "// <SitePopupHost />\n/* <SitePopupHost /> */ export default 1",
        "src/app/admin/vorschau.tsx": "<SitePopup src='x' />",
      }),
    );
    expect(r.singles).toEqual([path.join("src", "app", "page.tsx")]);
    expect(r.hosts).toEqual([]);
  });
});

describe("withCoreCms und Pop-up", () => {
  const inDir = (root: string, fn: () => unknown) => {
    const cwd = process.cwd();
    process.chdir(root);
    try {
      return fn();
    } finally {
      process.chdir(cwd);
    }
  };

  it("bricht ab ohne SitePopupHost", () => {
    const root = projekt({ ...ADMIN, "src/app/layout.tsx": "export default 1" });
    expect(() => inDir(root, () => withCoreCms({}))).toThrow(/SitePopupHost \/> fehlt/);
  });

  it("bricht ab bei alter Einbindung, auch wenn SitePopupHost da ist (sonst doppelt)", () => {
    const root = projekt({ ...ADMIN, "src/app/layout.tsx": HOST, "src/app/page.tsx": "<SitePopup {...p} />" });
    expect(() => inDir(root, () => withCoreCms({}))).toThrow(/einzeln auf Seiten/);
  });

  it("läuft mit SitePopupHost und ohne Admin", () => {
    expect(() => inDir(projekt({ ...ADMIN, "src/app/(site)/layout.tsx": HOST }), () => withCoreCms({}))).not.toThrow();
    expect(() => inDir(projekt({ "src/app/page.tsx": "x" }), () => withCoreCms({}))).not.toThrow();
  });
});
