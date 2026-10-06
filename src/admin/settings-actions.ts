"use server";

// Server Actions für Site-Settings + SMTP-Einstellungen.
// Quelle: template/src/app/admin/(dashboard)/einstellungen/actions.ts
// Auf core-cms-interne relative Imports umgestellt (statt @/utils/supabase/server, @/utils/encryption).

import { createClient } from "../supabase/server";
import { encrypt, decrypt } from "../supabase/encryption";
import { revalidatePath } from "next/cache";
import { SmtpEmailProvider } from "../email/smtp-provider";

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

  // email_settings statt site_settings: SMTP-Zugangsdaten dürfen nicht öffentlich lesbar
  // sein (site_settings hat bewusst eine public-read RLS-Policy für Logo/Site-Name/Kontakt).
  const { error } = await supabase
    .from("email_settings")
    .upsert(updatePayload);

  if (error) {
    console.error("Failed to save SMTP settings to email_settings:", error);
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

  // "layout" invalidiert den kompletten Seitenbaum - reicht projektübergreifend,
  // ohne einzelne kundenspezifische Routen (die hier vorher fest verdrahtet waren
  // und in anderen Projekten als reines No-op ins Leere liefen) fest zu verdrahten.
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getSmtpSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_settings")
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

/**
 * Sendet eine Test-E-Mail mit den GESPEICHERTEN SMTP-Einstellungen an die
 * Empfänger-Adresse (bzw. ersatzweise die Absender-Adresse). Nur für angemeldete Nutzer.
 */
export async function sendTestEmail() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Nicht angemeldet." };
  }

  const s = await getSmtpSettings();
  if (!s.host || !s.user || !s.pass || !s.fromEmail) {
    return { success: false, error: "SMTP-Einstellungen unvollständig (Server, Benutzer, Passwort und Absender-Adresse nötig). Bitte zuerst speichern." };
  }
  const to = s.recipient || s.fromEmail;

  try {
    const provider = new SmtpEmailProvider({
      host: s.host,
      port: parseInt(String(s.port), 10) || 587,
      user: s.user,
      pass: s.pass,
    });
    await provider.send({
      to,
      subject: "Test-E-Mail aus dem Admin",
      html: "<p>Diese Test-E-Mail bestätigt, dass die E-Mail-Einstellungen funktionieren.</p>",
      fromName: s.fromName || undefined,
      fromEmail: s.fromEmail,
    });
    return { success: true, to };
  } catch (err: any) {
    return { success: false, error: err?.message || "Versand fehlgeschlagen." };
  }
}
