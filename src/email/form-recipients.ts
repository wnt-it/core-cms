// Empfänger je Formular (ab v0.17.0). Ein Mailserver pro Website bleibt, nur die Adresse, an die eine Anfrage
// geht, kann je Formular abweichen. Gespeichert in email_settings.form_recipients (sql/0.17.0_empfaenger_je_formular.sql)
// als { "<Formular-Art>": "a@x.de, b@x.de" }. Reine Logik ohne Datenbank, damit sie testbar ist.
//
// Reihenfolge beim Versand:
//   1. Eintrag für die genaue Formular-Art, z. B. „Kontakt · Abteilung Nord“
//   2. Eintrag für die Gruppe davor, z. B. „Kontakt“ (wie die Gruppierung im Posteingang)
//   3. der „Empfänger für Anfragen“ aus den E-Mail-Einstellungen
// Leer oder ungültig zählt als „kein Eintrag“: Eine Anfrage geht nie verloren, weil eine Zeile falsch ist.

export type FormRecipients = Record<string, string>;

/** Für die Einstellungsseite: alle bekannten Formulare und ihre Empfänger. */
export interface FormRecipientsInfo {
  types: string[];
  recipients: FormRecipients;
  /** false: Datenbank-Aktualisierung v0.17.0 fehlt, Eingabe wird nicht angeboten */
  available: boolean;
}

/** Was getSmtpSettings() an das Formular im Admin gibt (ohne Passwort). */
export interface SmtpSettingsData {
  host: string;
  port: string;
  user: string;
  fromName: string;
  fromEmail: string;
  recipient: string;
  passStatus: "none" | "saved" | "unreadable";
  missing: string[];
  forms: FormRecipientsInfo;
}

/** Höchstzahl Adressen je Formular und Formulare insgesamt (Schutz vor versehentlich riesigen Einträgen). */
export const MAX_RECIPIENTS_PER_FORM = 10;
export const MAX_FORMS = 100;
const MAX_TYPE_LENGTH = 100;

const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

/** Gruppe einer Formular-Art: der Teil vor „ · “ (wie im Filter des Posteingangs). */
export function formGroup(type: string): string {
  return type.split(" · ")[0].trim();
}

/** Zerlegt „a@x.de, b@x.de“ (Komma, Semikolon oder Zeilenumbruch) in einzelne Adressen und prüft sie. */
export function parseRecipientList(value: string): { ok: true; list: string[] } | { ok: false; error: string } {
  const parts = value
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const invalid = parts.find((p) => !EMAIL.test(p) || p.length > 254);
  if (invalid) return { ok: false, error: `„${invalid}“ ist keine gültige E-Mail-Adresse.` };
  if (parts.length > MAX_RECIPIENTS_PER_FORM) return { ok: false, error: `Höchstens ${MAX_RECIPIENTS_PER_FORM} Adressen je Formular.` };
  return { ok: true, list: [...new Set(parts.map((p) => p.toLowerCase()))] };
}

/** Gespeicherten Wert lesen: nur Texte mit gültigen Adressen, alles andere wird ignoriert. */
export function normalizeFormRecipients(raw: unknown): FormRecipients {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: FormRecipients = {};
  for (const [type, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = type.trim();
    if (!key || key.length > MAX_TYPE_LENGTH || typeof value !== "string") continue;
    const parsed = parseRecipientList(value);
    if (parsed.ok && parsed.list.length) out[key] = parsed.list.join(", ");
  }
  return out;
}

/**
 * Eingaben aus dem Admin prüfen. Leere Felder fallen weg (= normaler Empfänger).
 * Liefert den Fehler mit Formularnamen, damit der Admin weiß, welche Zeile falsch ist.
 */
export function validateFormRecipients(input: Record<string, unknown>): { ok: true; value: FormRecipients } | { ok: false; error: string } {
  const out: FormRecipients = {};
  for (const [type, value] of Object.entries(input ?? {})) {
    const key = type.trim();
    if (typeof value !== "string" || !value.trim()) continue;
    if (!key || key.length > MAX_TYPE_LENGTH) return { ok: false, error: "Ungültiger Formularname." };
    const parsed = parseRecipientList(value);
    if (!parsed.ok) return { ok: false, error: `${key}: ${parsed.error}` };
    if (parsed.list.length) out[key] = parsed.list.join(", ");
  }
  if (Object.keys(out).length > MAX_FORMS) return { ok: false, error: `Höchstens ${MAX_FORMS} Formulare.` };
  return { ok: true, value: out };
}

/** Empfänger für eine Anfrage dieser Formular-Art (Reihenfolge siehe oben). */
export function recipientFor(type: string, recipients: FormRecipients, fallback: string): string {
  const t = (type || "").trim();
  return recipients[t] || recipients[formGroup(t)] || fallback;
}

/**
 * Formulare für die Einstellungsseite: im Projekt angemeldete, im Posteingang vorhandene und schon eingetragene
 * Formular-Arten, ohne Doppelte, alphabetisch. Neue Formulare erscheinen so ohne Eintrag im Projekt
 * spätestens mit ihrer ersten Anfrage.
 */
export function listFormTypes(...sources: Array<Iterable<string | null | undefined>>): string[] {
  const all = new Set<string>();
  for (const source of sources) {
    for (const t of source) {
      const v = (t ?? "").trim();
      if (v && v.length <= MAX_TYPE_LENGTH) all.add(v);
    }
  }
  return [...all].sort((a, b) => a.localeCompare(b, "de"));
}
