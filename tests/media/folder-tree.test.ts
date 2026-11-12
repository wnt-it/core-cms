import { describe, expect, it } from "vitest";
import { chunk, folderChain, folderIdsByPath, folderPath, isImage, moveConflict, withDescendants } from "../../src/media/folder-tree";
import { formatBytes } from "../../src/ui/format";

const folders = [
  { id: "a", name: "Projekte", parent_id: null },
  { id: "b", name: "2026", parent_id: "a" },
  { id: "c", name: "Fotos", parent_id: "b" },
  { id: "d", name: "Logos", parent_id: null },
];

describe("Ordnerbaum der Mediathek", () => {
  it("Pfad und Kette", () => {
    expect(folderPath(folders, "c")).toBe("Projekte / 2026 / Fotos");
    expect(folderChain(folders, null)).toEqual([]);
  });

  it("Unterordner beliebig tief", () => {
    expect([...withDescendants(folders, ["a"])].sort()).toEqual(["a", "b", "c"]);
  });

  it("verbietet Verschieben in sich selbst oder einen Unterordner", () => {
    expect(moveConflict(folders, ["a"], "a")).toMatch(/sich selbst/);
    expect(moveConflict(folders, ["a"], "c")).toMatch(/Unterordner/);
    expect(moveConflict(folders, ["b"], "d")).toBeNull();
    expect(moveConflict(folders, ["b"], null)).toBeNull();
  });

  it("hängt nicht bei Kreisen in alten Daten", () => {
    const kreis = [
      { id: "x", name: "X", parent_id: "y" },
      { id: "y", name: "Y", parent_id: "x" },
    ];
    expect(folderPath(kreis, "x")).toBe("Y / X");
    expect([...withDescendants(kreis, ["x"])].sort()).toEqual(["x", "y"]);
    expect(folderIdsByPath(kreis).size).toBe(0);
  });

  it("Pfade im Speicher zu Ordnern", () => {
    const map = folderIdsByPath(folders);
    expect(map.get("Projekte/2026/Fotos")).toBe("c");
    expect(map.get("Logos")).toBe("d");
  });

  it("Bilder und Stücke", () => {
    expect(isImage({ mime_type: "application/pdf" })).toBe(false);
    expect(isImage({ mime_type: null, name: "a.WEBP" })).toBe(true);
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("Größenangaben", () => {
  it("deutsch mit Komma", () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1,5 MB");
    expect(formatBytes(5 * 1024 * 1024, 0)).toBe("5 MB");
    expect(formatBytes(512)).toBe("512 Bytes");
    expect(formatBytes(0)).toBe("0 Bytes");
  });
});
