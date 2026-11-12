// Typen der Mediathek und reine Hilfen für den Ordnerbaum (ohne React, testbar).
// Alle Hilfen sind gegen Kreise geschützt: Ältere Datenbanken ohne sql/0.16.0_haertung.sql können einen
// Ordner enthalten, der (über Umwege) in sich selbst liegt. Früher hing dann das Verschieben-Fenster.

export interface MediaFolderRow {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface MediaFolderItem {
  id: string;
  name: string;
  isFolder: true;
}

export interface MediaFileItem {
  id: string;
  name: string;
  url: string;
  size: number | null;
  storage_path: string;
  mime_type: string | null;
  folder_id?: string | null;
  /** Nur bei der Suche: Ordner, in dem die Datei liegt */
  folderName?: string;
  isFolder: false;
}

export type MediaItem = MediaFolderItem | MediaFileItem;

/** Ordner von der obersten Ebene bis `id` (für den Pfad oben in der Mediathek). */
export function folderChain(folders: MediaFolderRow[], id: string | null): MediaFolderRow[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const chain: MediaFolderRow[] = [];
  const seen = new Set<string>();
  let current = id ? byId.get(id) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return chain;
}

/** Lesbarer Pfad, z. B. „Projekte / 2026 / Fotos“. */
export function folderPath(folders: MediaFolderRow[], id: string): string {
  return folderChain(folders, id).map((f) => f.name).join(" / ");
}

/** Die Ordner `ids` und alle ihre Unterordner (beliebig tief). */
export function withDescendants(folders: MediaFolderRow[], ids: string[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const f of folders) {
    if (!f.parent_id) continue;
    const list = children.get(f.parent_id) ?? [];
    list.push(f.id);
    children.set(f.parent_id, list);
  }
  const result = new Set<string>();
  const queue = [...ids];
  while (queue.length) {
    const id = queue.shift()!;
    if (result.has(id)) continue;
    result.add(id);
    queue.push(...(children.get(id) ?? []));
  }
  return result;
}

/** Fehlermeldung, wenn Ordner nicht nach `target` verschoben werden dürfen, sonst null. */
export function moveConflict(folders: MediaFolderRow[], movingFolderIds: string[], target: string | null): string | null {
  if (!target || movingFolderIds.length === 0) return null;
  if (movingFolderIds.includes(target)) return "Ein Ordner kann nicht in sich selbst verschoben werden.";
  if (withDescendants(folders, movingFolderIds).has(target)) return "Ein Ordner kann nicht in einen eigenen Unterordner verschoben werden.";
  return null;
}

/** Ordnerpfad im Speicher (z. B. „uploads/team“) zur Ordner-ID der Mediathek, angelegt wird nichts. */
export function folderIdsByPath(folders: MediaFolderRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of folders) {
    const chain = folderChain(folders, f.id);
    // Nur vollständige Ketten bis zur obersten Ebene (sonst liegt ein Kreis oder ein verwaister Ordner vor)
    if (chain[0]?.parent_id !== null) continue;
    const path = chain.map((c) => c.name).join("/");
    if (!map.has(path)) map.set(path, f.id);
  }
  return map;
}

export function isImage(item: { mime_type?: string | null; name?: string }): boolean {
  if (item.mime_type) return item.mime_type.startsWith("image/");
  return /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(item.name ?? "");
}

/** In Stücke teilen (für große Listen bei Abfragen mit `in` und beim Löschen im Speicher). */
export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
