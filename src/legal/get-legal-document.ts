// Liest ein Rechtsdokument aus legal_documents (Server). Ist noch nichts gespeichert oder fehlt die
// Tabelle (Migration sql/0.12.0_legal_documents.sql), gilt die Vorlage aus dem Projekt.

// Ohne Cookies lesen (legal_documents ist öffentlich lesbar), damit statische bzw.
// zwischengespeicherte Seiten nicht dynamisch werden.
import { supabase } from "../supabase/browser-singleton";
import { toPolicyBlocks, type LegalDocument, type LegalDocumentContent } from "./policy";

export async function getLegalDocument(slug: string, fallback: LegalDocumentContent): Promise<LegalDocument> {
  const template: LegalDocument = { slug, ...fallback, fromDatabase: false, updatedAt: null };
  try {
    const { data, error } = await supabase
      .from("legal_documents")
      .select("slug, title, version, blocks, updated_at")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return template;
    const blocks = toPolicyBlocks(data.blocks);
    if (blocks.length === 0) return template;
    return {
      slug,
      title: data.title || fallback.title,
      version: data.version || fallback.version,
      blocks,
      fromDatabase: true,
      updatedAt: data.updated_at ?? null,
    };
  } catch (err) {
    console.error("[getLegalDocument] unexpected error:", err);
    return template;
  }
}
