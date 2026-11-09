// Reine Logik des Einwilligungs-Features: kein React, kein Server-Zugriff, daher gut testbar.
// Hier liegen Speichern, Ablauf, Schlüsselbildung und die Prüfung eingehender Ereignisse.

import type {
  ConsentAction,
  ConsentChoices,
  ConsentEventPayload,
  ConsentService,
  ConsentTrigger,
  StoredConsent,
} from "./types";

/** Schlüssel im localStorage des Besuchers. */
export const STORAGE_KEY = "cms_consent";
/** Eigener Schlüssel für Ereignisse, die noch nicht ans Protokoll gesendet werden konnten. */
export const PENDING_KEY = "cms_consent_pending";
/** Wie lange eine Entscheidung gilt (12 Monate). */
export const CONSENT_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;
export const STORAGE_VERSION = 1 as const;
/** Nach so vielen Gruppen/Diensten wird die Liste auf der ersten Ebene nach Kategorie gruppiert. */
export const GROUP_AFTER = 5;

/** Entscheidungs-Schlüssel eines Dienstes: ändert sich nur bei wesentlicher Änderung (revision). */
export function decisionKey(service: Pick<ConsentService, "id" | "revision">): string {
  return `${service.id}@${service.revision}`;
}

export function isServiceId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,40}$/.test(id);
}

/** Stabile JSON-Darstellung (Schlüssel sortiert), Grundlage für den Hash des Textstands. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

export interface ConsentState {
  /** Entscheidung je bereits entschiedenem Dienst. */
  choices: ConsentChoices;
  /** Dienste, über die (noch) nicht entschieden wurde (neu, wesentlich geändert, abgelaufen oder nie gefragt). */
  undecided: string[];
}

/** Liest den gespeicherten Wert. Unbekannte, kaputte, abgelaufene oder neuere Formate gelten als „nicht entschieden“, nie als Zustimmung. */
export function resolveState(raw: string | null | undefined, services: ConsentService[], now: number): ConsentState {
  const allUndecided: ConsentState = { choices: {}, undecided: services.map((s) => s.id) };
  if (!raw) return allUndecided;
  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return allUndecided;
  }
  const s = stored as Partial<StoredConsent> | null;
  if (!s || s.v !== STORAGE_VERSION || typeof s.exp !== "number" || s.exp <= now || !s.c || !s.k) return allUndecided;

  const choices: ConsentChoices = {};
  const undecided: string[] = [];
  for (const svc of services) {
    const decided = typeof s.c[svc.id] === "boolean" && s.k[svc.id] === decisionKey(svc);
    if (decided) choices[svc.id] = s.c[svc.id];
    else undecided.push(svc.id);
  }
  return { choices, undecided };
}

/** Baut den Wert für den Browserspeicher. Nur Dienste der aktuellen Konfiguration, nur echte Booleans. */
export function buildStored(choices: ConsentChoices, services: ConsentService[], now: number): StoredConsent {
  const c: ConsentChoices = {};
  const k: Record<string, string> = {};
  for (const svc of services) {
    if (typeof choices[svc.id] === "boolean") {
      c[svc.id] = choices[svc.id];
      k[svc.id] = decisionKey(svc);
    }
  }
  return { v: STORAGE_VERSION, at: now, exp: now + CONSENT_LIFETIME_MS, c, k };
}

export function allChoices(services: ConsentService[], value: boolean): ConsentChoices {
  return Object.fromEntries(services.map((s) => [s.id, value]));
}

/** Dienste, die vorher erlaubt waren und jetzt nicht mehr (Widerruf). */
export function withdrawnServices(prev: ConsentChoices, next: ConsentChoices): string[] {
  return Object.keys(prev).filter((id) => prev[id] === true && next[id] !== true);
}

/** Wird der Banner im jeweiligen Modus gezeigt? Nur im Modus „banner“, solange etwas offen ist und nicht auf einer Rechtsseite. */
export function bannerVisible(modus: "einbettung" | "banner" | "aus", undecided: string[], pathname: string, rechtsseiten: string[]): boolean {
  if (modus !== "banner") return false;
  if (undecided.length === 0) return false;
  return !isLegalPath(pathname, rechtsseiten);
}

export function isLegalPath(pathname: string, rechtsseiten: string[]): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return rechtsseiten.some((r) => {
    const rr = r.replace(/\/+$/, "") || "/";
    return p === rr;
  });
}

/** Bestimmt aus alter und neuer Auswahl, was der Besucher getan hat. */
export function actionFor(choices: ConsentChoices, services: ConsentService[]): ConsentAction {
  if (services.length > 0 && services.every((s) => choices[s.id] === true)) return "accept_all";
  if (services.every((s) => choices[s.id] !== true)) return "reject_all";
  return "custom";
}

const ACTIONS: ConsentAction[] = ["accept_all", "reject_all", "custom"];
const TRIGGERS: ConsentTrigger[] = ["banner", "settings", "embed"];

/** Strenge Prüfung eines vom Browser gesendeten Ereignisses. Gibt bereinigte Daten oder einen Fehler zurück. */
export function validateEvent(
  body: unknown,
  services: ConsentService[],
): { ok: true; value: ConsentEventPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Ungültige Anfrage." };
  const b = body as Record<string, unknown>;
  if (!ACTIONS.includes(b.action as ConsentAction)) return { ok: false, error: "Ungültige Aktion." };
  if (!TRIGGERS.includes(b.trigger as ConsentTrigger)) return { ok: false, error: "Ungültiger Auslöser." };
  if (!b.choices || typeof b.choices !== "object" || Array.isArray(b.choices)) return { ok: false, error: "Ungültige Auswahl." };

  const known = new Set(services.map((s) => s.id));
  const choices: ConsentChoices = {};
  for (const [id, v] of Object.entries(b.choices as Record<string, unknown>)) {
    if (!known.has(id)) return { ok: false, error: "Unbekannter Dienst." };
    if (typeof v !== "boolean") return { ok: false, error: "Ungültiger Wert." };
    choices[id] = v;
  }
  if (Object.keys(choices).length === 0) return { ok: false, error: "Leere Auswahl." };

  let pagePath: string | undefined;
  if (typeof b.pagePath === "string" && b.pagePath) {
    // Nur der Pfad, nie Parameter oder Fragment (könnten Personenbezug enthalten)
    pagePath = b.pagePath.split(/[?#]/)[0].slice(0, 200);
    if (!pagePath.startsWith("/")) pagePath = undefined;
  }
  return { ok: true, value: { action: b.action as ConsentAction, trigger: b.trigger as ConsentTrigger, choices, pagePath } };
}

/** Gibt es in der Konfiguration Dienste, die eine Einwilligung brauchen? Aktuell jeder Dienst im Katalog. */
export function requiresConsent(services: ConsentService[]): boolean {
  return services.length > 0;
}
