// Vergleich von Versionsnummern. Ohne React und Server.

/** Tags des öffentlichen core-cms-Repos (Quelle für „Update verfügbar“). */
export const CORE_TAGS_URL = "https://api.github.com/repos/wnt-it/core-cms/tags?per_page=30";

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/** Versionen aus den Tags (z. B. „v0.13.0“), die neuer sind als current, neueste zuerst. */
export function newerVersions(tags: string[], current: string): string[] {
  return tags
    .map((t) => t.replace(/^v/, ""))
    .filter((v) => /^\d+\.\d+\.\d+$/.test(v) && compareVersions(v, current) > 0)
    .sort((a, b) => compareVersions(b, a));
}
