// Mehrfachbearbeitung, Server-Teil: Auswahlwerte laden und Änderungen
// abgesichert speichern. Nur auf dem Server importieren (Seiten, Server Actions).
//
// Sicherheit: Der Browser schickt nur den Schlüssel der Beschreibung, die IDs,
// das Feld und den Wert. Tabelle, Spalten und fester Filter kommen immer aus
// der Beschreibung des Projekts. Jeder Wert wird nach Feldtyp geprüft, und vor
// dem Schreiben wird kontrolliert, dass alle IDs im festen Filter liegen.

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { dbErrorMessage } from "../auth/auth-errors";
import {
  opsFor,
  type BulkClientConfig,
  type BulkConfig,
  type BulkField,
  type BulkOp,
  type BulkOption,
  type BulkOptionSource,
  type BulkRegistry,
  type BulkRequest,
  type BulkResult,
  type BulkScope,
} from "./types";

type Supabase = any;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const CHUNK = 25;

class BulkError extends Error {}

// Tabellen und Spalten kommen aus der Beschreibung, daher ohne die Tabellen-Typen von Supabase
function applyScope(query: any, scope?: BulkScope): any {
  let q = query;
  for (const [col, val] of Object.entries(scope ?? {})) q = q.eq(col, val);
  return q;
}

async function loadOptions(supabase: Supabase, source: BulkOptionSource): Promise<BulkOption[]> {
  if (Array.isArray(source)) return source;
  if (typeof source === "function") return source(supabase);
  const valueCol = source.value ?? "id";
  const query = applyScope(supabase.from(source.table).select(`${valueCol}, ${source.label}`), source.scope)
    .order(source.order ?? source.label)
    .limit(2000);
  const { data, error } = await query;
  if (error) {
    console.error(`[bulk] Auswahl aus ${source.table} konnte nicht geladen werden:`, error.message);
    return [];
  }
  return (data ?? []).map((row: any) => ({ value: String(row[valueCol]), label: String(row[source.label] ?? "") }));
}

/** Beschreibung für den Browser aufbereiten: Auswahlwerte laden, Funktionen weglassen. */
export async function getBulkClientConfig(registry: BulkRegistry, key: string): Promise<BulkClientConfig> {
  const config = registry[key];
  if (!config) throw new Error(`[bulk] Keine Beschreibung mit dem Schlüssel "${key}".`);
  const supabase = await createClient();

  const fields = await Promise.all(
    Object.entries(config.fields).map(async ([fieldKey, f]) => {
      const options = "options" in f && f.options ? await loadOptions(supabase, f.options) : undefined;
      return {
        key: fieldKey,
        type: f.type,
        label: f.label,
        ...(f.hint ? { hint: f.hint } : {}),
        ops: opsFor(f),
        ...(options ? { options } : {}),
        ...(f.type === "number"
          ? { suffix: f.suffix, min: f.min, max: f.max, decimals: f.decimals ?? 2 }
          : {}),
        ...(f.type === "boolean" ? { trueLabel: f.trueLabel ?? "Ja", falseLabel: f.falseLabel ?? "Nein" } : {}),
        ...("maxLength" in f && f.maxLength ? { maxLength: f.maxLength } : {}),
        ...(f.type === "image" && f.folder ? { folder: f.folder } : {}),
      };
    }),
  );

  return {
    key,
    label: config.label ?? { one: "Eintrag", many: "Einträge" },
    fields: JSON.parse(JSON.stringify(fields)),
    canDelete: !!config.delete,
    maxItems: config.maxItems ?? 500,
  };
}

/* ---------- Werte prüfen ---------- */

function round(n: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function checkNumber(field: Extract<BulkField, { type: "number" }>, n: number) {
  if (field.min !== undefined && n < field.min) throw new BulkError(`„${field.label}“ darf nicht kleiner als ${field.min} sein.`);
  if (field.max !== undefined && n > field.max) throw new BulkError(`„${field.label}“ darf nicht größer als ${field.max} sein.`);
  return n;
}

function toNumber(label: string, value: unknown): number {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  if (typeof value === "boolean" || value === null || value === "" || !Number.isFinite(n)) throw new BulkError(`Bitte für „${label}“ eine Zahl eingeben.`);
  return n;
}

function cleanString(field: BulkField, value: unknown, fallbackMax: number): string {
  if (typeof value !== "string") throw new BulkError(`Ungültiger Wert für „${field.label}“.`);
  const v = value.trim();
  if (!v) throw new BulkError(`Bitte einen Wert für „${field.label}“ eingeben oder „Leeren“ wählen.`);
  const max = ("maxLength" in field && field.maxLength) || fallbackMax;
  if (v.length > max) throw new BulkError(`„${field.label}“ ist zu lang (höchstens ${max} Zeichen).`);
  return v;
}

function isUrl(v: string) {
  if (v.startsWith("/") && !v.startsWith("//")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Einzelwert für „Setzen“ prüfen und in Datenbank-Form bringen. */
function cleanSetValue(field: BulkField, value: unknown, options: BulkOption[] | null): unknown {
  switch (field.type) {
    case "text":
      return cleanString(field, value, 500);
    case "textarea":
      return cleanString(field, value, 10000);
    case "url": {
      const v = cleanString(field, value, 2000);
      if (!isUrl(v)) throw new BulkError(`„${field.label}“: Bitte eine vollständige Adresse eingeben (mit https://).`);
      return v;
    }
    case "email": {
      const v = cleanString(field, value, 254);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new BulkError(`„${field.label}“: Bitte eine gültige E-Mail-Adresse eingeben.`);
      return v;
    }
    case "tel": {
      const v = cleanString(field, value, 40);
      if (!/^[+\d\s()/.-]{3,40}$/.test(v)) throw new BulkError(`„${field.label}“: Bitte eine gültige Telefonnummer eingeben.`);
      return v;
    }
    case "number": {
      const n = toNumber(field.label, value);
      return checkNumber(field, round(n, field.decimals ?? 2));
    }
    case "boolean":
      if (typeof value !== "boolean") throw new BulkError(`Ungültiger Wert für „${field.label}“.`);
      return value;
    case "select": {
      if (typeof value !== "string" || !options?.some((o) => o.value === value)) throw new BulkError(`Bitte für „${field.label}“ einen Eintrag aus der Liste wählen.`);
      return value;
    }
    case "date": {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) throw new BulkError(`Bitte für „${field.label}“ ein gültiges Datum wählen.`);
      return value;
    }
    case "datetime": {
      const t = typeof value === "string" ? Date.parse(value) : NaN;
      if (Number.isNaN(t)) throw new BulkError(`Bitte für „${field.label}“ Datum und Uhrzeit wählen.`);
      return new Date(t).toISOString();
    }
    case "color": {
      if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) throw new BulkError(`„${field.label}“: Bitte eine Farbe im Format #RRGGBB angeben.`);
      return value.toLowerCase();
    }
    case "image": {
      const v = cleanString(field, value, 2000);
      if (!isUrl(v)) throw new BulkError(`„${field.label}“: Ungültige Bildadresse.`);
      return v;
    }
    case "custom":
      try {
        return field.validate(value);
      } catch (err: any) {
        throw new BulkError(err?.message || `Ungültiger Wert für „${field.label}“.`);
      }
    default:
      throw new BulkError("Dieser Feldtyp kann so nicht gesetzt werden.");
  }
}

/** Liste von Werten (Mehrfachauswahl, Verknüpfung) prüfen. */
function cleanList(field: BulkField, value: unknown, options: BulkOption[] | null): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new BulkError(`Bitte für „${field.label}“ mindestens einen Eintrag wählen.`);
  if (value.length > 100) throw new BulkError(`„${field.label}“: höchstens 100 Einträge auf einmal.`);
  const list = [...new Set(value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean))];
  if (list.length === 0) throw new BulkError(`Ungültiger Wert für „${field.label}“.`);
  if (options) {
    const allowed = new Set(options.map((o) => o.value));
    if (list.some((v) => !allowed.has(v))) throw new BulkError(`Bitte für „${field.label}“ nur Einträge aus der Liste wählen.`);
  } else if (list.some((v) => v.length > 100)) {
    throw new BulkError(`„${field.label}“: Einträge dürfen höchstens 100 Zeichen lang sein.`);
  }
  return list;
}

/* ---------- Speichern ---------- */

async function inChunks<T>(items: T[], fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += CHUNK) await Promise.all(items.slice(i, i + CHUNK).map(fn));
}

async function updateRows(supabase: Supabase, config: BulkConfig, rows: Array<{ id: string; patch: Record<string, unknown> }>) {
  const idCol = config.idColumn ?? "id";
  await inChunks(rows, async ({ id, patch }) => {
    const { error } = await applyScope(supabase.from(config.table).update(patch).eq(idCol, id), config.scope);
    if (error) throw error;
  });
}

async function runUpdate(supabase: Supabase, config: BulkConfig, ids: string[], fieldKey: string, op: BulkOp, value: unknown): Promise<number> {
  const field = config.fields[fieldKey];
  if (!field) throw new BulkError("Dieses Feld kann hier nicht gemeinsam geändert werden.");
  if (!opsFor(field).includes(op)) throw new BulkError(`„${field.label}“ kann so nicht geändert werden.`);
  const idCol = config.idColumn ?? "id";
  const options = "options" in field && field.options ? await loadOptions(supabase, field.options) : null;

  // Verknüpfungstabelle (z. B. Marke ↔ Kategorien)
  if (field.type === "relation") {
    const list = op === "clear" ? [] : cleanList(field, value, options);
    const { through, localKey, foreignKey } = field;
    if (op === "clear" || op === "set") {
      const { error } = await supabase.from(through).delete().in(localKey, ids);
      if (error) throw error;
    }
    if (op === "remove") {
      const { error } = await supabase.from(through).delete().in(localKey, ids).in(foreignKey, list);
      if (error) throw error;
    }
    if (op === "add" || op === "set") {
      let existing = new Set<string>();
      if (op === "add") {
        const { data, error } = await supabase.from(through).select(`${localKey}, ${foreignKey}`).in(localKey, ids).in(foreignKey, list);
        if (error) throw error;
        existing = new Set((data ?? []).map((r: any) => `${r[localKey]}|${r[foreignKey]}`));
      }
      const rows = ids.flatMap((id) => list.filter((v) => !existing.has(`${id}|${v}`)).map((v) => ({ [localKey]: id, [foreignKey]: v })));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from(through).insert(rows.slice(i, i + 500));
        if (error) throw error;
      }
    }
    return ids.length;
  }

  // Liste in einer Spalte (text[] oder jsonb)
  if (field.type === "multiselect") {
    if (op === "clear" || op === "set") {
      const list = op === "clear" ? [] : cleanList(field, value, options);
      const { error } = await applyScope(supabase.from(config.table).update({ [fieldKey]: list }).in(idCol, ids), config.scope);
      if (error) throw error;
      return ids.length;
    }
    const list = cleanList(field, value, options);
    const { data, error } = await applyScope(supabase.from(config.table).select(`${idCol}, ${fieldKey}`).in(idCol, ids), config.scope);
    if (error) throw error;
    const rows = (data ?? []).map((row: any) => {
      const current: string[] = Array.isArray(row[fieldKey]) ? row[fieldKey].map(String) : [];
      const next = op === "add" ? [...new Set([...current, ...list])] : current.filter((v) => !list.includes(v));
      return { id: String(row[idCol]), patch: { [fieldKey]: next } };
    });
    await updateRows(supabase, config, rows);
    return rows.length;
  }

  // Zahl um Betrag oder Prozent ändern (Einträge ohne Zahl bleiben leer)
  if (field.type === "number" && (op === "increase" || op === "decrease" || op === "percent")) {
    const amount = toNumber(field.label, value);
    if (op === "percent" && (amount < -100 || amount > 1000)) throw new BulkError("Bitte einen Prozentwert zwischen -100 und 1000 eingeben.");
    if (op !== "percent" && amount < 0) throw new BulkError("Bitte einen positiven Betrag eingeben.");
    const { data, error } = await applyScope(supabase.from(config.table).select(`${idCol}, ${fieldKey}`).in(idCol, ids), config.scope);
    if (error) throw error;
    const decimals = field.decimals ?? 2;
    const rows = (data ?? [])
      .filter((row: any) => row[fieldKey] !== null && row[fieldKey] !== undefined)
      .map((row: any) => {
        const cur = Number(row[fieldKey]);
        const next = op === "increase" ? cur + amount : op === "decrease" ? cur - amount : cur * (1 + amount / 100);
        return { id: String(row[idCol]), patch: { [fieldKey]: checkNumber(field, round(next, decimals)) } };
      });
    await updateRows(supabase, config, rows);
    return rows.length;
  }

  // Alle bekommen denselben Wert
  const next = op === "clear" ? null : cleanSetValue(field, value, options);
  const { data, error } = await applyScope(
    supabase.from(config.table).update({ [fieldKey]: next }).in(idCol, ids),
    config.scope,
  ).select(idCol);
  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * Für die Server Action des Projekts:
 *   "use server";
 *   export async function bulkAction(key: string, request: BulkRequest) { return runBulk(BULK, key, request) }
 */
export async function runBulk(registry: BulkRegistry, key: string, request: BulkRequest): Promise<BulkResult> {
  const config = typeof key === "string" && Object.hasOwn(registry, key) ? registry[key] : undefined;
  if (!config) return { success: false, error: "Unbekannte Liste." };

  const supabase = await createClient();
  // Server Actions sind öffentlich aufrufbar, daher nicht nur auf RLS verlassen
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const max = config.maxItems ?? 500;
  const rawIds = Array.isArray(request?.ids) ? request.ids : [];
  const ids = [...new Set(rawIds.filter((id): id is string => typeof id === "string" && ID_PATTERN.test(id)))];
  if (ids.length === 0 || ids.length !== rawIds.length) return { success: false, error: "Bitte zuerst Einträge auswählen." };
  if (ids.length > max) return { success: false, error: `Höchstens ${max} Einträge auf einmal.` };

  const idCol = config.idColumn ?? "id";
  const label = config.label ?? { one: "Eintrag", many: "Einträge" };

  try {
    // Alle IDs müssen existieren und im festen Filter liegen (z. B. richtige Abteilung)
    const { data: found, error: findError } = await applyScope(supabase.from(config.table).select(idCol).in(idCol, ids), config.scope);
    if (findError) throw findError;
    if ((found?.length ?? 0) !== ids.length) {
      return { success: false, error: `Einige ${label.many} gibt es nicht mehr oder sie gehören nicht in diese Liste. Bitte die Seite neu laden.` };
    }

    if (request.action === "delete") {
      if (!config.delete) return { success: false, error: "Löschen ist hier nicht möglich." };
      const blocked = await config.beforeDelete?.({ supabase, ids });
      if (typeof blocked === "string" && blocked) return { success: false, error: blocked };
      const { data, error } = await applyScope(supabase.from(config.table).delete().in(idCol, ids), config.scope).select(idCol);
      if (error) throw error;
      revalidate(config);
      return { success: true, count: data?.length ?? 0 };
    }

    if (request.action !== "update") return { success: false, error: "Unbekannte Aktion." };
    const count = await runUpdate(supabase, config, ids, request.field, request.op, request.value);
    await config.afterUpdate?.({ supabase, ids, field: request.field, op: request.op, value: request.value });
    revalidate(config);
    return { success: true, count };
  } catch (err: any) {
    if (err instanceof BulkError) return { success: false, error: err.message };
    console.error(`[bulk] ${config.table}:`, err);
    return { success: false, error: dbErrorMessage(err, "Speichern") };
  }
}

function revalidate(config: BulkConfig) {
  revalidatePath("/admin", "layout");
  for (const path of config.revalidate ?? []) revalidatePath(path, "layout");
}
