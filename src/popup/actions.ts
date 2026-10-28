"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { dbErrorMessage } from "../auth/auth-errors";

export async function savePopupSettings(input: { enabled: boolean; imageUrl: string; alt: string }) {
  const supabase = await createClient();
  // Server Actions sind öffentlich aufrufbar, daher nicht nur auf RLS verlassen
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  if (input.enabled && !input.imageUrl) {
    return { success: false, error: "Bitte zuerst ein Bild wählen, sonst kann das Pop-up nicht erscheinen." };
  }

  const { error } = await supabase
    .from("site_settings")
    .update({
      popup_enabled: input.enabled,
      popup_image_url: input.imageUrl || null,
      popup_image_alt: input.alt.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "general");

  if (error) {
    console.error("Failed to save popup settings:", error);
    if (/popup_/.test(error.message || "")) {
      return { success: false, error: "In der Datenbank fehlen die Pop-up-Felder. Bitte die Datenbank-Aktualisierung für core-cms v0.9.0 ausführen." };
    }
    return { success: false, error: dbErrorMessage(error, "Speichern des Pop-ups") };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
