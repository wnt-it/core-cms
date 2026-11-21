// Liest das Impressum (Formularangaben) aus legal_documents.data (Server). Ist noch nichts gespeichert oder fehlt die
// Tabelle/Spalte (Migration sql/0.12.0_legal_documents.sql), gilt die Vorlage aus dem Projekt.

import { supabase } from "../supabase/browser-singleton";
import { normalizeImpressum, type ImpressumData } from "./impressum";

export interface ImpressumDocument {
  data: ImpressumData;
  /** true: aus der Datenbank, false: Vorlage des Projekts (noch nie gespeichert). */
  fromDatabase: boolean;
  updatedAt: string | null;
}

export async function getImpressum(slug: string, template: unknown): Promise<ImpressumDocument> {
  const fallback: ImpressumDocument = { data: normalizeImpressum(template), fromDatabase: false, updatedAt: null };
  try {
    const { data: row, error } = await supabase.from("legal_documents").select("data, updated_at").eq("slug", slug).maybeSingle();
    if (error || !row?.data) return fallback;
    return { data: normalizeImpressum(row.data), fromDatabase: true, updatedAt: row.updated_at ?? null };
  } catch (err) {
    console.error("[getImpressum] unexpected error:", err);
    return fallback;
  }
}
