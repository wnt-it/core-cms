// Formular-Definition und Prüfungen für den Posteingang (ab v0.15.0). Reiner Code ohne Server- oder
// Browser-Abhängigkeiten, daher in beiden Welten und in Tests nutzbar.
//
// Der Core gibt keine Pflichtfelder vor. Welche Felder ein Formular hat und welche davon Pflicht sind,
// legt das Projekt mit defineForm fest. Nur Felder aus dieser Liste werden gespeichert.

/** Felder, die in eigenen Spalten der Tabelle submissions landen. Alles andere kommt in metadata. */
export const COLUMN_FIELDS = ["name", "email", "phone", "company", "subject", "message"] as const;
export type ColumnField = (typeof COLUMN_FIELDS)[number];

/** Namen, die der Core selbst benutzt (Spam-Schutz, Herkunft, Anhänge). */
export const RESERVED_FIELDS = ["website", "form_age", "source_page", "source_url", "files"] as const;

export type FieldKind = "text" | "long" | "email" | "phone";

export interface FormField {
  /** Bezeichnung im Posteingang und in der Benachrichtigung, z. B. "Wunschtermin" */
  label: string;
  /** Pflichtfeld (Standard: nein) */
  required?: boolean;
  /** text (Standard, 200 Zeichen), long (5000), email (Format wird geprüft), phone */
  kind?: FieldKind;
  /** Höchstlänge, überschreibt den Standard der Art */
  maxLength?: number;
}

export type AttachmentType = "pdf" | "jpg" | "png";

export interface AttachmentRules {
  /** Erlaubte Dateitypen (Standard: pdf, jpg, png). Mehr gibt es bewusst nicht. */
  types?: AttachmentType[];
  /** Höchstgröße je Datei in MB (Standard 10, höchstens 25) */
  maxSizeMb?: number;
  /** Höchstzahl Dateien (Standard 3, höchstens 10) */
  maxFiles?: number;
  /** Pflicht, mindestens eine Datei (Standard: nein) */
  required?: boolean;
  /** Bezeichnung im Fehlertext (Standard "Anhang") */
  label?: string;
}

export interface FormNotify {
  /** Vorsatz im Betreff der Benachrichtigung (Standard: Formular-Art) */
  subjectPrefix?: string;
  /** Name der Website im Kopf der Benachrichtigung */
  siteName?: string;
  /** Akzentfarbe (Hex) der Benachrichtigung */
  brandColor?: string;
}

export interface FormDefinition {
  /** Formular-Art im Posteingang, z. B. "Kontakt", "Bewerbung", "Rückruf" */
  type: string;
  /** Erlaubte Felder. Schlüssel name, email, phone, company, subject, message landen in eigenen Spalten. */
  fields: Record<string, FormField>;
  /** Anhänge erlauben (Standard: keine) */
  attachments?: AttachmentRules;
  /** E-Mail-Benachrichtigung (Standard: an, mit den SMTP-Daten aus den Einstellungen). false = keine. */
  notify?: FormNotify | false;
  /** Feld, das als Betreff dient, wenn es kein Feld "subject" gibt */
  subjectField?: string;
}

export const ATTACHMENT_MIME: Record<AttachmentType, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
};

const KIND_MAX: Record<FieldKind, number> = { text: 200, long: 5000, email: 254, phone: 40 };
const DEFAULT_KIND: Partial<Record<string, FieldKind>> = { email: "email", phone: "phone", message: "long" };

/** Prüft die Definition beim Start, damit Fehler beim Programmieren auffallen und nicht beim Besucher. */
export function defineForm(def: FormDefinition): FormDefinition {
  if (!def.type?.trim()) throw new Error("[core-cms] defineForm: type fehlt.");
  for (const key of Object.keys(def.fields)) {
    if ((RESERVED_FIELDS as readonly string[]).includes(key)) {
      throw new Error(`[core-cms] defineForm: Das Feld "${key}" ist für den Core reserviert.`);
    }
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) {
      throw new Error(`[core-cms] defineForm: Feldname "${key}" nur mit a–z, 0–9 und _ (höchstens 40 Zeichen).`);
    }
  }
  if (def.subjectField && !def.fields[def.subjectField]) {
    throw new Error(`[core-cms] defineForm: subjectField "${def.subjectField}" ist kein Feld des Formulars.`);
  }
  return def;
}

export function fieldKind(key: string, field: FormField): FieldKind {
  return field.kind ?? DEFAULT_KIND[key] ?? "text";
}

export function attachmentRules(rules: AttachmentRules) {
  return {
    types: rules.types?.length ? rules.types : (["pdf", "jpg", "png"] as AttachmentType[]),
    maxBytes: Math.min(Math.max(rules.maxSizeMb ?? 10, 0.1), 25) * 1024 * 1024,
    maxFiles: Math.min(Math.max(Math.trunc(rules.maxFiles ?? 3), 1), 10),
    required: rules.required === true,
    label: rules.label ?? "Anhang",
  };
}

/** Werte aus FormData oder JSON: Strings bleiben, Listen (Checkboxen) werden mit Komma verbunden. */
export function toText(value: unknown): string {
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ");
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export interface DeclaredFile {
  name: string;
  size: number;
  type: string;
}

export interface ValidatedSubmission {
  columns: Partial<Record<ColumnField, string>>;
  metadata: Record<string, string>;
  labels: Record<string, string>;
  files: DeclaredFile[];
}

export type ValidationResult = { ok: true; value: ValidatedSubmission } | { ok: false; error: string; field?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LINKS = 5;

/** Prüft Eingaben gegen die Definition. Unbekannte Felder werden ignoriert. */
export function validateSubmission(form: FormDefinition, input: Record<string, unknown>): ValidationResult {
  const columns: Partial<Record<ColumnField, string>> = {};
  const metadata: Record<string, string> = {};
  const labels: Record<string, string> = {};

  for (const [key, field] of Object.entries(form.fields)) {
    const value = toText(input[key]);
    const kind = fieldKind(key, field);
    if (!value) {
      if (field.required) return { ok: false, field: key, error: `Bitte füllen Sie das Feld „${field.label}“ aus.` };
      continue;
    }
    const max = field.maxLength ?? KIND_MAX[kind];
    if (value.length > max) {
      return { ok: false, field: key, error: `Das Feld „${field.label}“ ist zu lang (höchstens ${max} Zeichen).` };
    }
    if (kind === "email" && !EMAIL.test(value)) {
      return { ok: false, field: key, error: `Bitte geben Sie im Feld „${field.label}“ eine gültige E-Mail-Adresse ein.` };
    }
    if ((value.match(/https?:\/\//gi) ?? []).length > MAX_LINKS) {
      return { ok: false, field: key, error: `Das Feld „${field.label}“ enthält zu viele Links.` };
    }
    labels[key] = field.label;
    if ((COLUMN_FIELDS as readonly string[]).includes(key)) columns[key as ColumnField] = kind === "email" ? value.toLowerCase() : value;
    else metadata[key] = value;
  }

  const files = Array.isArray(input.files) ? (input.files as unknown[]) : [];
  if (files.length > 0 && !form.attachments) return { ok: false, error: "Dieses Formular nimmt keine Anhänge an." };
  const declared: DeclaredFile[] = [];
  if (form.attachments) {
    const rules = attachmentRules(form.attachments);
    if (rules.required && files.length === 0) return { ok: false, field: "files", error: `Bitte fügen Sie einen ${rules.label} bei.` };
    if (files.length > rules.maxFiles) {
      return { ok: false, field: "files", error: `Höchstens ${rules.maxFiles} Dateien möglich.` };
    }
    const allowed = rules.types.map((t) => ATTACHMENT_MIME[t]);
    for (const raw of files) {
      const f = raw as Partial<DeclaredFile>;
      const name = typeof f.name === "string" ? f.name.trim().slice(0, 200) : "";
      const size = typeof f.size === "number" ? f.size : NaN;
      const type = typeof f.type === "string" ? f.type : "";
      if (!name || !Number.isFinite(size) || size <= 0) return { ok: false, field: "files", error: "Eine Datei ist leer oder beschädigt." };
      if (!allowed.includes(type)) {
        return { ok: false, field: "files", error: `„${name}“: erlaubt sind nur ${rules.types.map((t) => t.toUpperCase()).join(", ")}.` };
      }
      if (size > rules.maxBytes) {
        return { ok: false, field: "files", error: `„${name}“ ist zu groß (höchstens ${Math.round(rules.maxBytes / 1024 / 1024)} MB).` };
      }
      declared.push({ name, size, type });
    }
  }

  return { ok: true, value: { columns, metadata, labels, files: declared } };
}

/** Erkennt den echten Dateityp am Inhalt (erste Bytes), unabhängig von Endung und Angabe des Browsers. */
export function sniffType(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return "image/png";
  }
  return null;
}

/** Dateiname für den Speicher: ohne Pfade und Sonderzeichen, Endung passend zum Typ. */
export function storageFileName(name: string, type: string): string {
  const ext = type === "application/pdf" ? "pdf" : type === "image/png" ? "png" : "jpg";
  const base = name
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "datei"}.${ext}`;
}
