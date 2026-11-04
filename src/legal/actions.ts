"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { dbErrorMessage } from "../auth/auth-errors";
import { POLICY_LIMITS, isPolicyBlock, renumberPolicyBlocks, type PolicyBlock } from "./policy";

const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;

export async function saveLegalDocument(input: {
  slug: string;
  title: string;
  version: string;
  blocks: PolicyBlock[];
  /** Pfad der öffentlichen Seite, die neu aufgebaut werden soll, z. B. "/datenschutz". */
  publicPath?: string;
  /** false: Überschriften nicht nummerieren (schlichte Texte wie das Impressum). Standard: true. */
  numbered?: boolean;
}) {
  const supabase = await createClient();
  // Server Actions sind öffentlich aufrufbar, daher nicht nur auf RLS verlassen
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  if (!SLUG.test(input.slug)) return { success: false, error: "Ungültige Dokumentkennung." };
  const title = String(input.title ?? "").trim();
  const version = String(input.version ?? "").trim();
  if (!title) return { success: false, error: "Bitte einen Titel angeben." };
  if (title.length > POLICY_LIMITS.titleLength || version.length > POLICY_LIMITS.versionLength) {
    return { success: false, error: "Titel oder Fassung ist zu lang." };
  }
  if (!Array.isArray(input.blocks) || input.blocks.length === 0 || input.blocks.length > POLICY_LIMITS.blocks) {
    return { success: false, error: `Das Dokument braucht zwischen 1 und ${POLICY_LIMITS.blocks} Abschnitte.` };
  }
  if (!input.blocks.every(isPolicyBlock) || input.blocks.some((b) => b.text.length > POLICY_LIMITS.textLength)) {
    return { success: false, error: `Ungültiger Abschnitt (Text höchstens ${POLICY_LIMITS.textLength} Zeichen).` };
  }
  // Leere Abschnitte nicht speichern, Überschriften nach ihrer Stelle neu nummerieren
  const trimmed = input.blocks
    .map((b) => (b.ref && b.t.startsWith("h") ? { t: b.t, text: b.text.trim(), ref: b.ref } : { t: b.t, text: b.text.trim() }))
    .filter((b) => b.text);
  const blocks = input.numbered === false ? trimmed : renumberPolicyBlocks(trimmed);
  const refs = blocks.flatMap((b) => (b.ref ? [b.ref] : []));
  if (new Set(refs).size !== refs.length) return { success: false, error: "Eine Verweis-Kennung kommt doppelt vor." };

  const { error } = await supabase.from("legal_documents").upsert({
    slug: input.slug,
    title,
    version,
    blocks,
    updated_at: new Date().toISOString(),
    updated_by: user.email ?? null,
  });

  if (error) {
    console.error("Failed to save legal document:", error);
    if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message || "")) {
      return { success: false, error: "In der Datenbank fehlt die Tabelle für Rechtstexte. Bitte die Datenbank-Aktualisierung für core-cms v0.12.0 ausführen." };
    }
    if (error.code === "42501" || /permission denied|row-level security/i.test(error.message || "")) {
      return { success: false, error: "Keine Berechtigung auf die Tabelle für Rechtstexte. Bitte die Datenbank-Aktualisierung für core-cms v0.12.0 (inklusive der Zeilen mit „grant“) ausführen." };
    }
    return { success: false, error: dbErrorMessage(error, "Speichern des Dokuments") };
  }

  revalidatePath("/", "layout");
  if (input.publicPath?.startsWith("/")) revalidatePath(input.publicPath);
  return { success: true };
}
