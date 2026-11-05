"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../supabase/server";
import { dbErrorMessage } from "../../auth/auth-errors";
import { renumberPolicyBlocks } from "../policy";
import { DATENSCHUTZ_TEMPLATE_VERSION, buildDatenschutz, normalizeDatenschutzConfig, type DatenschutzConfig } from "./datenschutz";
import { SICHERUNG_SLUG, VORLAGE_SLUG } from "./vorlage";

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

/** Speichert nur die Einstellungen der Vorlage (Firma, Bausteine …), ohne den Text zu ändern. */
export async function saveDatenschutzVorlage(input: { config: DatenschutzConfig; version: string | null }) {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };
  const config = normalizeDatenschutzConfig(input.config);
  const { error } = await supabase.from("legal_documents").upsert({
    slug: VORLAGE_SLUG,
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
 * Der bisherige Text wird vorher als Sicherung abgelegt (legal_documents, Zeile „datenschutz-sicherung“).
 */
export async function applyDatenschutzVorlage(input: { config: DatenschutzConfig; publicPath?: string }) {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false as const, error: "Nicht angemeldet." };
  const config = normalizeDatenschutzConfig(input.config);
  const doc = buildDatenschutz(config);
  const blocks = renumberPolicyBlocks(doc.blocks);
  const now = new Date().toISOString();

  // 1) Sicherung des bisherigen Textes
  const { data: old } = await supabase.from("legal_documents").select("title, version, blocks").eq("slug", "datenschutz").maybeSingle();
  if (old && Array.isArray(old.blocks) && old.blocks.length > 0) {
    const { error } = await supabase.from("legal_documents").upsert({
      slug: SICHERUNG_SLUG,
      title: old.title || "Sicherung",
      version: old.version || "",
      blocks: old.blocks,
      updated_at: now,
    });
    if (error) return dbError(error, "back up old text");
  }

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
    slug: VORLAGE_SLUG,
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
