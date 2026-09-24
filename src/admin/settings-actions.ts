"use server";

// Server Actions für Site-Settings + SMTP-Einstellungen.
// Quelle: template/src/app/admin/(dashboard)/einstellungen/actions.ts
// Auf core-cms-interne relative Imports umgestellt (statt @/utils/supabase/server, @/utils/encryption).

import { createClient } from "../supabase/server";
import { encrypt, decrypt } from "../supabase/encryption";
import { revalidatePath } from "next/cache";

export async function saveSmtpSettings(formData: FormData) {
  const supabase = await createClient();

  const host = formData.get("smtp_host")?.toString() || "";
  const port = formData.get("smtp_port")?.toString() || "587";
  const user = formData.get("smtp_user")?.toString() || "";
  const pass = formData.get("smtp_pass")?.toString() || "";
  const fromName = formData.get("smtp_from_name")?.toString() || "";
  const fromEmail = formData.get("smtp_from_email")?.toString() || "";
  const recipient = formData.get("smtp_recipient")?.toString() || "";

  const updatePayload: Record<string, any> = {
    id: "general",
    smtp_host: host || null,
    smtp_port: port || null,
    smtp_user: user || null,
    smtp_from_name: fromName || null,
    smtp_from_email: fromEmail || null,
    smtp_recipient: recipient || null,
    updated_at: new Date().toISOString(),
  };

  if (pass) {
    updatePayload.smtp_pass = encrypt(pass);
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert(updatePayload);

  if (error) {
    console.error("Failed to save SMTP settings to site_settings:", error);
    return { success: false, error: "Fehler beim Speichern der SMTP-Einstellungen: " + error.message };
  }

  revalidatePath("/admin/einstellungen");
  return { success: true };
}

export async function saveGeneralSettings(payload: any) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      id: "general",
      ...payload,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Failed to save site settings:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateHeroImageSetting(fieldId: string, url: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      id: "general",
      [fieldId]: url || null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error(`Failed to update hero setting ${fieldId}:`, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/sortiment");
  revalidatePath("/marken");
  revalidatePath("/abverkauf");
  revalidatePath("/aktionen");
  revalidatePath("/jobs");
  revalidatePath("/kontakt");
  return { success: true };
}

export async function getSmtpSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, smtp_recipient")
    .eq("id", "general")
    .maybeSingle();

  if (error || !data) {
    return { host: "", port: "587", user: "", pass: "", fromName: "", fromEmail: "", recipient: "" };
  }

  const decryptedPass = data.smtp_pass ? decrypt(data.smtp_pass) : "";

  return {
    host: data.smtp_host || "",
    port: data.smtp_port || "587",
    user: data.smtp_user || "",
    pass: decryptedPass,
    fromName: data.smtp_from_name || "",
    fromEmail: data.smtp_from_email || "",
    recipient: data.smtp_recipient || "",
  };
}
