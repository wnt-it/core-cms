// Liest, welche Einstellungen und Version der Datenschutz-Vorlage ein Projekt verwendet (Server).
// Gespeichert in legal_documents, Zeile „datenschutz-vorlage“ (Spalte data: { version, config, appliedAt }).

import { supabase } from "../../supabase/browser-singleton";
import { DEFAULT_DATENSCHUTZ_CONFIG, normalizeDatenschutzConfig, type DatenschutzConfig } from "./datenschutz";

export const VORLAGE_SLUG = "datenschutz-vorlage";
export const SICHERUNG_SLUG = "datenschutz-sicherung";

export interface DatenschutzVorlageStand {
  /** Version der Vorlage, aus der der Text zuletzt erzeugt wurde; null: noch nie aus der Vorlage erzeugt */
  version: string | null;
  /** Zeitpunkt des letzten Erzeugens (ISO) */
  appliedAt: string | null;
  config: DatenschutzConfig;
  /** true: Einstellungen schon einmal gespeichert; false: Vorschläge aus den Website-Einstellungen */
  gespeichert: boolean;
}

/** Vorschläge aus den Website-Einstellungen (site_settings), soweit dort gepflegt. */
async function defaultsFromSettings(): Promise<Partial<DatenschutzConfig>> {
  try {
    const { data } = await supabase.from("site_settings").select("*").eq("id", "general").maybeSingle();
    if (!data) return {};
    const cityLine = String(data.address_city || "").trim(); // „PLZ Ort“
    const m = cityLine.match(/^(\d{4,5})\s+(.*)$/);
    const email = String(data.contact_email || "").trim();
    const domain = email.includes("@") ? email.split("@")[1] : "";
    return {
      kurzname: String(data.site_name || "").replace(/\s+(gmbh|ag|e\.v\.|ug)\b.*$/i, "").trim(),
      firma: String(data.site_name || "").trim(),
      strasse: String(data.address_street || "").trim(),
      plz: m ? m[1] : "",
      ort: m ? m[2] : cityLine,
      telefon: String(data.contact_phone || "").trim(),
      email,
      datenschutzEmail: domain ? `datenschutz@${domain}` : "",
    };
  } catch {
    return {};
  }
}

/** @param vorgabe Startwerte des Projekts (gelten, solange noch keine Einstellungen gespeichert sind; überschreiben die Vorschläge aus den Website-Einstellungen) */
export async function getDatenschutzVorlage(vorgabe?: Partial<DatenschutzConfig>): Promise<DatenschutzVorlageStand> {
  try {
    const { data } = await supabase.from("legal_documents").select("data").eq("slug", VORLAGE_SLUG).maybeSingle();
    const d = data?.data as { version?: unknown; config?: unknown; appliedAt?: unknown } | null | undefined;
    if (d && d.config) {
      return {
        version: typeof d.version === "string" ? d.version : null,
        appliedAt: typeof d.appliedAt === "string" ? d.appliedAt : null,
        config: normalizeDatenschutzConfig(d.config),
        gespeichert: true,
      };
    }
  } catch (err) {
    console.error("[getDatenschutzVorlage] unexpected error:", err);
  }
  return { version: null, appliedAt: null, config: normalizeDatenschutzConfig({ ...DEFAULT_DATENSCHUTZ_CONFIG, ...(await defaultsFromSettings()), ...vorgabe, module: { ...DEFAULT_DATENSCHUTZ_CONFIG.module, ...(vorgabe?.module ?? {}) } }), gespeichert: false };
}
