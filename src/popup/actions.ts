"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage } from "../auth/auth-errors";
import { POPUP_FREQUENCIES, POPUP_MAX_DELAY, POPUP_PAGES, parsePopupPaths, type PopupFrequency, type PopupPages } from "./options";
import { getAdminSession } from "../auth/session";

const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

export async function savePopupSettings(input: {
  enabled: boolean;
  imageUrl: string;
  alt: string;
  from?: string;
  until?: string;
  frequency?: PopupFrequency;
  delaySeconds?: number;
  pages?: PopupPages;
  /** Eine Adresse pro Zeile. */
  paths?: string;
}) {
  const auth = await getAdminSession();
  if (!auth) return { success: false, error: "Nicht angemeldet." };
  const { supabase } = auth;

  if (input.enabled && !input.imageUrl) {
    return { success: false, error: "Bitte zuerst ein Bild wählen, sonst kann das Pop-up nicht erscheinen." };
  }

  const from = String(input.from ?? "").trim();
  const until = String(input.until ?? "").trim();
  try {
    if ((from && !validDate(from)) || (until && !validDate(until))) throw new Error("date");
  } catch {
    return { success: false, error: "Bitte gültige Daten für den Zeitraum angeben." };
  }
  if (from && until && until < from) return { success: false, error: "Das Enddatum liegt vor dem Startdatum." };

  const frequency = input.frequency ?? "session";
  const pages = input.pages ?? "all";
  if (!POPUP_FREQUENCIES.includes(frequency) || !POPUP_PAGES.includes(pages)) return { success: false, error: "Ungültige Auswahl bei Häufigkeit oder Seiten." };
  const delay = Math.round(Number(input.delaySeconds ?? 0));
  if (!Number.isFinite(delay) || delay < 0 || delay > POPUP_MAX_DELAY) return { success: false, error: `Die Verzögerung kann 0 bis ${POPUP_MAX_DELAY} Sekunden betragen.` };
  const paths = parsePopupPaths(input.paths);
  if (pages === "custom" && paths.length === 0) return { success: false, error: "Bitte mindestens eine Seite eintragen, z. B. /angebote." };

  const { error } = await supabase
    .from("site_settings")
    .update({
      popup_enabled: input.enabled,
      popup_image_url: input.imageUrl || null,
      popup_image_alt: input.alt.trim() || null,
      popup_from: from || null,
      popup_until: until || null,
      popup_frequency: frequency,
      popup_delay_seconds: delay,
      popup_pages: pages,
      popup_paths: paths.length ? paths.join("\n") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "general");

  if (error) {
    console.error("Failed to save popup settings:", error);
    if (/popup_(from|until|frequency|delay|pages|paths)/.test(error.message || "")) {
      return { success: false, error: "In der Datenbank fehlen die Pop-up-Einstellungen. Bitte die Datenbank-Aktualisierung für core-cms v0.12.0 (Pop-up-Einstellungen) ausführen." };
    }
    if (/popup_/.test(error.message || "")) {
      return { success: false, error: "In der Datenbank fehlen die Pop-up-Felder. Bitte die Datenbank-Aktualisierung für core-cms v0.9.0 ausführen." };
    }
    return { success: false, error: dbErrorMessage(error, "Speichern des Pop-ups") };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
