import { describe, expect, it } from "vitest";
import { isAllowedImageSettingColumn, sanitizeGeneralSettings } from "../../src/admin/general-settings";

describe("Einstellungen speichern", () => {
  it("nimmt nur bekannte Felder", () => {
    const { values, ignored } = sanitizeGeneralSettings({ site_name: " Muster ", id: "x", popup_enabled: true, updated_at: "1970" });
    expect(values).toEqual({ site_name: "Muster" });
    expect(ignored.sort()).toEqual(["id", "popup_enabled", "updated_at"]);
  });
  it("verwirft gefährliche Bild-Adressen", () => {
    const { values } = sanitizeGeneralSettings({ logo_url: "javascript:alert(1)", favicon_url: "/favicon.png" });
    expect(values.logo_url).toBeNull();
    expect(values.favicon_url).toBe("/favicon.png");
    expect(sanitizeGeneralSettings({ logo_url: "//fremd.example/x.png" }).values.logo_url).toBeNull();
    expect(sanitizeGeneralSettings({ logo_url: "https://cdn.example/x.png" }).values.logo_url).toBe("https://cdn.example/x.png");
  });
  it("Bild-Spalten der Projekte, aber keine Kern-Spalten", () => {
    expect(isAllowedImageSettingColumn("hero_image_url")).toBe(true);
    for (const c of ["id", "site_name", "logo_url", "popup_image_url", "smtp_pass", "x; drop table", "Hero"]) {
      expect(isAllowedImageSettingColumn(c)).toBe(false);
    }
  });
});
