"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage } from "../auth/auth-errors";
import { IMPRESSUM_SLUG, impressumToBlocks, missingImpressumFields, normalizeImpressum, type ImpressumData } from "./impressum";
import { getAdminSession } from "../auth/session";
import { isMissingColumn, isMissingTable } from "../supabase/db-errors";

const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;
const MAX_VALUE = 4000;

export async function saveImpressum(input: {
  slug: string;
  data: ImpressumData;
  /** Pfad der öffentlichen Seite, die neu aufgebaut werden soll, z. B. "/impressum". */
  publicPath?: string;
}) {
  const auth = await getAdminSession();
  if (!auth) return { success: false, error: "Nicht angemeldet." };
  const { supabase } = auth;

  if (!SLUG.test(input.slug) || input.slug !== IMPRESSUM_SLUG) return { success: false, error: "Ungültige Dokumentkennung." };
  // Nur bekannte Abschnitte und Felder übernehmen, Werte kürzen
  const data = normalizeImpressum(input.data);
  for (const s of Object.values(data)) for (const k of Object.keys(s.v)) s.v[k] = s.v[k].trim().slice(0, MAX_VALUE);

  const missing = missingImpressumFields(data);
  if (missing.length > 0) return { success: false, error: `Es fehlen noch Pflichtangaben: ${missing.slice(0, 3).join("; ")}${missing.length > 3 ? " …" : ""}` };

  const { error } = await supabase.from("legal_documents").upsert({
    slug: input.slug,
    title: "Impressum",
    version: "",
    blocks: impressumToBlocks(data),
    data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to save impressum:", error);
    if (isMissingColumn(error)) {
      return { success: false, error: "In der Datenbank fehlt die Spalte „data“ für das Impressum. Bitte die Datenbank-Aktualisierung für core-cms v0.12.0 ausführen." };
    }
    if (isMissingTable(error)) {
      return { success: false, error: "In der Datenbank fehlt die Tabelle für Rechtstexte. Bitte die Datenbank-Aktualisierung für core-cms v0.12.0 ausführen." };
    }
    if (error.code === "42501" || /permission denied|row-level security/i.test(error.message || "")) {
      return { success: false, error: "Keine Berechtigung auf die Tabelle für Rechtstexte. Bitte die Datenbank-Aktualisierung für core-cms v0.12.0 (inklusive der Zeilen mit „grant“) ausführen." };
    }
    return { success: false, error: dbErrorMessage(error, "Speichern des Impressums") };
  }

  revalidatePath("/", "layout");
  if (input.publicPath?.startsWith("/")) revalidatePath(input.publicPath);
  return { success: true };
}
