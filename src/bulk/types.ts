// Mehrfachbearbeitung (ab v0.10.0): Beschreibung, welche Felder einer Tabelle
// für mehrere Einträge auf einmal geändert werden dürfen. Das Projekt legt pro
// Tabelle eine Beschreibung mit defineBulk an, der Core bringt Auswahl,
// Aktionsleiste, Eingabefelder und das abgesicherte Speichern mit.
// Diese Datei hat keine "use client"/"use server"-Angabe: Sie wird von der
// Server-Seite (Optionen laden, Speichern) und für Typen im Browser genutzt.

/** Fester Filter, z. B. { abteilung: "richardprinz" }. Gilt bei jedem Lesen und Schreiben. */
export type BulkScope = Record<string, string | number | boolean>;

export interface BulkOption {
  value: string;
  label: string;
}

/**
 * Auswahlwerte: feste Liste, aus einer Tabelle geladen (z. B. Marken) oder eigene
 * Ladefunktion auf dem Server (z. B. Bereiche mit Gruppe davor).
 */
export type BulkOptionSource =
  | BulkOption[]
  | ((supabase: any) => Promise<BulkOption[]>)
  | {
      table: string;
      /** Spalte für den Wert (Standard: id) */
      value?: string;
      /** Spalte für den angezeigten Namen */
      label: string;
      scope?: BulkScope;
      /** Sortierung (Standard: label) */
      order?: string;
    };

interface FieldBase {
  label: string;
  /** Kurzer Hinweis unter dem Eingabefeld */
  hint?: string;
  /** Feld darf nicht geleert werden */
  required?: boolean;
}

export type BulkField =
  | (FieldBase & { type: "text" | "textarea" | "url" | "email" | "tel"; maxLength?: number })
  | (FieldBase & {
      type: "number";
      /** Einheit rechts im Feld, z. B. "€" oder "m²" */
      suffix?: string;
      min?: number;
      max?: number;
      /** Nachkommastellen (Standard: 2), 0 = ganze Zahl */
      decimals?: number;
    })
  | (FieldBase & { type: "boolean"; trueLabel?: string; falseLabel?: string })
  | (FieldBase & { type: "select"; options: BulkOptionSource })
  | (FieldBase & {
      type: "multiselect";
      /** Ohne options: freie Begriffe */
      options?: BulkOptionSource;
      /** Spalte als text[] (Standard) oder jsonb-Liste */
      storage?: "array" | "json";
    })
  | (FieldBase & { type: "date" | "datetime" })
  | (FieldBase & { type: "color" })
  | (FieldBase & { type: "image"; folder?: string })
  | (FieldBase & {
      type: "relation";
      /** Verknüpfungstabelle, z. B. brand_categories */
      through: string;
      /** Spalte mit der ID des bearbeiteten Eintrags, z. B. brand_id */
      localKey: string;
      /** Spalte mit der ID des verknüpften Eintrags, z. B. category_id */
      foreignKey: string;
      options: BulkOptionSource;
    })
  | (FieldBase & {
      type: "custom";
      /** Prüft und bereinigt den Wert auf dem Server. Fehler werfen = ablehnen. */
      validate: (value: unknown) => unknown;
    });

export type BulkFieldType = BulkField["type"];

/**
 * set: alle bekommen denselben Wert · clear: Wert entfernen
 * add/remove: Einträge einer Liste/Verknüpfung ergänzen oder entfernen
 * increase/decrease: Zahl um einen Betrag ändern · percent: Zahl um Prozent ändern
 */
export type BulkOp = "set" | "clear" | "add" | "remove" | "increase" | "decrease" | "percent";

export interface BulkHookContext {
  // Supabase-Client der angemeldeten Person (gleicher Typ wie createClient() im Core)
  supabase: any;
  ids: string[];
}

export interface BulkConfig {
  table: string;
  /** Bezeichnung für Meldungen, z. B. { one: "Produkt", many: "Produkte" } */
  label?: { one: string; many: string };
  /** Spalte mit der ID (Standard: id) */
  idColumn?: string;
  scope?: BulkScope;
  fields: Record<string, BulkField>;
  /** Mehrere Einträge auf einmal löschen erlauben */
  delete?: boolean;
  /** Höchstzahl je Vorgang (Standard: 500) */
  maxItems?: number;
  /** Pfade, die danach neu aufgebaut werden (revalidatePath mit "layout") */
  revalidate?: string[];
  /** Läuft nach dem Ändern, z. B. Sortierung anpassen */
  afterUpdate?: (ctx: BulkHookContext & { field: string; op: BulkOp; value: unknown }) => Promise<void> | void;
  /** Läuft vor dem Löschen. Ein Text als Rückgabe bricht mit dieser Meldung ab. */
  beforeDelete?: (ctx: BulkHookContext) => Promise<string | void> | string | void;
}

export type BulkRegistry = Record<string, BulkConfig>;

export function defineBulk<T extends BulkConfig>(config: T): T {
  return config;
}

export function defineBulkRegistry<T extends BulkRegistry>(registry: T): T {
  return registry;
}

/** Welche Änderungsarten ein Feldtyp anbietet. */
export function opsFor(field: BulkField): BulkOp[] {
  const clear: BulkOp[] = field.required ? [] : ["clear"];
  switch (field.type) {
    case "boolean":
      return ["set"];
    case "number":
      return ["set", "increase", "decrease", "percent", ...clear];
    case "multiselect":
    case "relation":
      return ["add", "remove", "set", ...clear];
    default:
      return ["set", ...clear];
  }
}

/* ---------- Für den Browser (ohne Funktionen) ---------- */

export interface BulkClientField {
  key: string;
  type: BulkFieldType;
  label: string;
  hint?: string;
  ops: BulkOp[];
  options?: BulkOption[];
  suffix?: string;
  min?: number;
  max?: number;
  decimals?: number;
  trueLabel?: string;
  falseLabel?: string;
  maxLength?: number;
  folder?: string;
}

export interface BulkClientConfig {
  key: string;
  label: { one: string; many: string };
  fields: BulkClientField[];
  canDelete: boolean;
  maxItems: number;
}

export type BulkRequest =
  | { action: "update"; ids: string[]; field: string; op: BulkOp; value?: unknown }
  | { action: "delete"; ids: string[] };

export type BulkResult = { success: true; count: number } | { success: false; error: string };

/** Server Action des Projekts: (Schlüssel der Beschreibung, Auftrag) → Ergebnis */
export type BulkAction = (key: string, request: BulkRequest) => Promise<BulkResult>;
