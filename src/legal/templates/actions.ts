"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../supabase/server";
import { dbErrorMessage } from "../../auth/auth-errors";
import { renumberPolicyBlocks, toPolicyBlocks } from "../policy";
import { DATENSCHUTZ_TEMPLATE_VERSION, buildDatenschutz, normalizeDatenschutzConfig, type DatenschutzConfig } from "./datenschutz";
import { EINSTELLUNGEN_SLUG, MAX_SICHERUNGEN, SICHERUNG_SLUG } from "./vorlage";

type Db = Awaited<ReturnType<typeof createClient>>;

async function requireUser() {
  const supabase = await createClient();
  // Server Actions sind öffentlich aufrufbar, daher nicht nur auf RLS verlassen
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

const dbError = (error: { code?: string; message?: string }, what: string) => {
  console.error(`Failed to ${what}:`, error);
  if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message || "")) {
    return { success: false as const, error: "In der Datenbank fehlt die Tabelle für Rechtstexte. Bitte die Datenbank-Aktualisierung für core-cms v0.12.0 ausführen." };
  }
  if (error.code === "42501" || /permission denied|row-level security/i.test(error.message || "")) {
    return { success: false as const, error: "Keine Berechtigung auf die Tabelle für Rechtstexte. Bitte die Datenbank-Aktualisierung für core-cms v0.12.0 ausführen." };
  }
  return { success: false as const, error: dbErrorMessage(error, "Speichern") };
};

/** „JJJJMMTT-HHMMSS“ (UTC) für den Namen einer Sicherung. */
const stamp = (iso: string) => iso.replace(/\.\d+Z$/, "").replace(/[-:]/g, "").replace("T", "-");

/**
 * Legt den aktuellen Text als neue Sicherung ab (Zeile „datenschutz-sicherung-<Zeitstempel>“) und löscht die ältesten,
 * sodass höchstens MAX_SICHERUNGEN bleiben. Ohne gespeicherten Text gibt es nichts zu sichern.
 */
async function backupCurrentText(supabase: Db, now: string) {
  const { data: old } = await supabase.from("legal_documents").select("title, version, blocks").eq("slug", "datenschutz").maybeSingle();
  if (!old || !Array.isArray(old.blocks) || old.blocks.length === 0) return null;

  const { error } = await supabase.from("legal_documents").upsert({
    slug: `${SICHERUNG_SLUG}-${stamp(now)}`,
    title: old.title || "Datenschutzerklärung",
    version: old.version || "",
    blocks: old.blocks,
    updated_at: now,
  });
  if (error) return dbError(error, "back up old text");

  // Älteste Sicherungen entfernen; schlägt das fehl, ist die neue Sicherung trotzdem gespeichert
  const { data: all } = await supabase
    .from("legal_documents")
    .select("slug")
    .like("slug", `${SICHERUNG_SLUG}%`)
    .order("updated_at", { ascending: false });
  const surplus = (all ?? []).slice(MAX_SICHERUNGEN).map((r) => r.slug);
  if (surplus.length > 0) {
    const { error: delError } = await supabase.from("legal_documents").delete().in("slug", surplus);
    if (delError) console.error("Failed to prune old backups:", delError);
  }
  return null;
}

/** Speichert nur die Einstellungen der Vorlage (Firma, Bausteine …), ohne den Text zu ändern. */
export async function saveDatenschutzVorlage(input: { config: DatenschutzConfig; version: string | null }) {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };
  const config = normalizeDatenschutzConfig(input.config);
  const { error } = await supabase.from("legal_documents").upsert({
    slug: EINSTELLUNGEN_SLUG,
    title: "Einstellungen der Datenschutz-Vorlage",
    version: "",
    blocks: [],
    data: { version: input.version, config, appliedAt: null },
    updated_at: new Date().toISOString(),
  });
  if (error) return dbError(error, "save template settings");
  revalidatePath("/", "layout");
  return { success: true as const };
}

/**
 * Erzeugt den Text aus der aktuellen Vorlage und den Einstellungen und speichert ihn als Datenschutzerklärung.
 * Der bisherige Text wird vorher als Sicherung abgelegt (legal_documents, Zeilen „datenschutz-sicherung-…“, die letzten 10).
 */
export async function applyDatenschutzVorlage(input: { config: DatenschutzConfig; publicPath?: string }) {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };
  const config = normalizeDatenschutzConfig(input.config);
  const doc = buildDatenschutz(config);
  const blocks = renumberPolicyBlocks(doc.blocks);
  const now = new Date().toISOString();

  // 1) Sicherung des bisherigen Textes
  const backupError = await backupCurrentText(supabase, now);
  if (backupError) return backupError;

  // 2) neuer Text
  const { error: docError } = await supabase.from("legal_documents").upsert({
    slug: "datenschutz",
    title: doc.title,
    version: doc.version,
    blocks,
    updated_at: now,
  });
  if (docError) return dbError(docError, "save generated text");

  // 3) Stand der Vorlage merken
  const { error: metaError } = await supabase.from("legal_documents").upsert({
    slug: EINSTELLUNGEN_SLUG,
    title: "Einstellungen der Datenschutz-Vorlage",
    version: "",
    blocks: [],
    data: { version: DATENSCHUTZ_TEMPLATE_VERSION, config, appliedAt: now },
    updated_at: now,
  });
  if (metaError) return dbError(metaError, "save template state");

  revalidatePath("/", "layout");
  if (input.publicPath?.startsWith("/")) revalidatePath(input.publicPath);
  return { success: true as const };
}

/**
 * Stellt eine Sicherung als aktuelle Datenschutzerklärung wieder her. Der Text, der dadurch ersetzt wird, wird vorher selbst
 * gesichert, die Wiederherstellung lässt sich also wieder rückgängig machen.
 */
export async function restoreDatenschutzSicherung(input: { slug: string; publicPath?: string }) {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };
  if (typeof input.slug !== "string" || !input.slug.startsWith(SICHERUNG_SLUG) || !/^[a-z0-9-]{1,60}$/.test(input.slug)) {
    return { success: false as const, error: "Ungültige Sicherung." };
  }

  const { data: backup, error: readError } = await supabase.from("legal_documents").select("title, version, blocks").eq("slug", input.slug).maybeSingle();
  if (readError) return dbError(readError, "read backup");
  const blocks = toPolicyBlocks(backup?.blocks);
  if (!backup || blocks.length === 0) return { success: false as const, error: "Diese Sicherung ist nicht mehr vorhanden." };

  const now = new Date().toISOString();
  const backupError = await backupCurrentText(supabase, now);
  if (backupError) return backupError;

  const { error } = await supabase.from("legal_documents").upsert({
    slug: "datenschutz",
    title: backup.title || "Datenschutzerklärung",
    version: backup.version || "",
    blocks,
    updated_at: now,
  });
  if (error) return dbError(error, "restore backup");

  revalidatePath("/", "layout");
  if (input.publicPath?.startsWith("/")) revalidatePath(input.publicPath);
  return { success: true as const };
}
