import { describe, expect, it } from "vitest";
import { errorMessage, moveMediaItems, toFile } from "../../src/media/media-actions";
import type { MediaItem } from "../../src/media/folder-tree";

// Kleiner Ersatz für den Supabase-Client: Ordnerliste lesen, Änderungen mitschreiben
function fakeSupabase(folders: { id: string; name: string; parent_id: string | null }[]) {
  const updates: { table: string; values: unknown; ids: string[] }[] = [];
  const client = {
    from(table: string) {
      return {
        select: async () => ({ data: table === "media_folders" ? folders : [], error: null }),
        update: (values: unknown) => ({
          in: async (_col: string, ids: string[]) => {
            updates.push({ table, values, ids });
            return { error: null };
          },
        }),
      };
    },
  };
  return { client: client as never, updates };
}

const folder = (id: string): MediaItem => ({ id, name: id, isFolder: true });

describe("Mediathek-Aktionen", () => {
  it("verschiebt Dateien und Ordner", async () => {
    const { client, updates } = fakeSupabase([
      { id: "a", name: "A", parent_id: null },
      { id: "b", name: "B", parent_id: null },
    ]);
    const file = toFile({ id: "f1", display_name: "x.jpg", storage_path: "x.jpg", url: "u", size: 1, mime_type: "image/jpeg", folder_id: null });
    expect(await moveMediaItems(client, [file, folder("a")], "b")).toBe(2);
    expect(updates.map((u) => u.table)).toEqual(["media_files", "media_folders"]);
  });

  it("lehnt Ordner in eigenen Unterordner ab und ändert nichts", async () => {
    const { client, updates } = fakeSupabase([
      { id: "a", name: "A", parent_id: null },
      { id: "a1", name: "A1", parent_id: "a" },
    ]);
    await expect(moveMediaItems(client, [folder("a")], "a1")).rejects.toThrow();
    expect(updates).toEqual([]);
  });

  it("Fehlermeldung aus beliebigem Fehler", () => {
    expect(errorMessage(new Error("kaputt"), "Ersatz")).toBe("kaputt");
    expect(errorMessage({ message: "" }, "Ersatz")).toBe("Ersatz");
    expect(errorMessage(null, "Ersatz")).toBe("Ersatz");
  });
});
