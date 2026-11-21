// Einstellungen des Pop-ups (rein, ohne React und Server): Werte, Beschriftungen und die Regeln, wann es erscheint.

export type PopupFrequency = "session" | "always" | "day" | "week";
export type PopupPages = "all" | "home" | "custom";

export const POPUP_FREQUENCIES: PopupFrequency[] = ["session", "always", "day", "week"];
export const POPUP_PAGES: PopupPages[] = ["all", "home", "custom"];

export const POPUP_FREQUENCY_LABELS: Record<PopupFrequency, string> = {
  session: "Einmal pro Besuch (Standard)",
  always: "Bei jedem Öffnen der Website",
  day: "Einmal pro Tag",
  week: "Einmal pro Woche",
};

export const POPUP_PAGES_LABELS: Record<PopupPages, string> = {
  all: "Auf allen Seiten",
  home: "Nur auf der Startseite",
  custom: "Nur auf bestimmten Seiten",
};

export const POPUP_MAX_DELAY = 60;
export const POPUP_MAX_PATHS = 20;

/** Eine Adresse pro Zeile, z. B. „/angebote“ oder „/aktionen/*“ (alles darunter). Ungültiges wird verworfen. */
export function parsePopupPaths(text: string | null | undefined): string[] {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\/[A-Za-z0-9._~\-\/%]*\*?$/.test(l) && l.length <= 100)
    .slice(0, POPUP_MAX_PATHS);
}

/** Passt die aktuelle Adresse zu einem Eintrag? „/aktionen/*“ trifft /aktionen und alles darunter, sonst genau diese Adresse. */
function pathMatches(pathname: string, pattern: string): boolean {
  const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  if (pattern.endsWith("*")) {
    const base = clean(pattern.slice(0, -1)) || "/";
    return base === "/" || pathname === base || pathname.startsWith(base + "/");
  }
  return clean(pathname) === clean(pattern);
}

export function popupAllowedOnPath(pathname: string, pages: PopupPages, paths: string[]): boolean {
  if (pages === "home") return pathname === "/";
  if (pages === "custom") return paths.some((p) => pathMatches(pathname, p));
  return true;
}

/** Heutiges Datum als JJJJ-MM-TT (Ortszeit des Besuchers). */
export function todayIso(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Liegt heute im Zeitraum? Leere Grenzen gelten als offen; beide Tage zählen noch mit. */
export function popupInWindow(from: string, until: string, today = todayIso()): boolean {
  if (from && today < from) return false;
  if (until && today > until) return false;
  return true;
}

export const FREQUENCY_MS: Record<"day" | "week", number> = { day: 24 * 3600 * 1000, week: 7 * 24 * 3600 * 1000 };
