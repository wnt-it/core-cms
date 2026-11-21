import { describe, expect, it } from "vitest";
import { buildGroups, clean, nextSibling, numbered, prevSibling, subEnd, withIds } from "../../src/legal/editor-groups";

const rows = withIds([
  { t: "p", text: "Einleitung" },
  { t: "h1", text: "1. Allgemeines" },
  { t: "p", text: "Text A" },
  { t: "h2", text: "1.1 Unterpunkt" },
  { t: "p", text: "Text B" },
  { t: "h1", text: "2. Rechte" },
]);

describe("Rechtstext-Editor: Gruppen", () => {
  it("entfernt Nummern im Editor und setzt sie beim Speichern wieder", () => {
    expect(rows[1].text).toBe("Allgemeines");
    expect(numbered(rows).map((b) => b.text)).toEqual(["Einleitung", "1. Allgemeines", "Text A", "1.1 Unterpunkt", "Text B", "2. Rechte"]);
  });

  it("teilt in Gruppen mit Einleitung", () => {
    const gs = buildGroups(rows);
    expect(gs.map((g) => g.head?.text ?? "(Einleitung)")).toEqual(["(Einleitung)", "Allgemeines", "Unterpunkt", "Rechte"]);
    expect(gs[1].items.map((r) => r.text)).toEqual(["Text A"]);
  });

  it("Nachbarn und Unterabschnitte", () => {
    const gs = buildGroups(rows);
    expect(subEnd(gs, 1)).toBe(3); // Allgemeines umfasst den Unterpunkt
    expect(nextSibling(gs, 1)).toBe(3);
    expect(prevSibling(gs, 3)).toBe(1);
    expect(prevSibling(gs, 2)).toBe(-1); // Unterpunkt hat keinen Vorgänger auf seiner Ebene
  });

  it("IDs sind eindeutig, leere Blöcke fallen beim Bereinigen weg", () => {
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(clean([{ t: "p", text: "  " }, { t: "p", text: " x " }])).toEqual([{ t: "p", text: "x" }]);
  });
});
