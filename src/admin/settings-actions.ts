"use server";

// Server Actions für Site-Settings + SMTP-Einstellungen.
// Auf core-cms-interne relative Imports umgestellt (statt @/utils/supabase/server, @/utils/encryption).

import { createClient } from "../supabase/server";
import { encrypt } from "../supabase/encryption";
import { EMPTY_SMTP_VALUES, loadSmtpSettings, type SmtpFormValues } from "../email/smtp-settings";
import { isAllowedImageSettingColumn, sanitizeGeneralSettings, type GeneralSettingsField } from "./general-settings";
import { revalidatePath } from "next/cache";
import { SmtpEmailProvider } from "../email/smtp-provider";
import { dbErrorMessage, smtpErrorMessage } from "../auth/auth-errors";

// Defense in depth: Server Actions sind öffentlich aufrufbar, daher nie nur auf RLS verlassen.
async function isLoggedIn(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}
// (Gleiche Prüfung wie getAdminSession in auth/session.ts; hier mit dem schon erzeugten Client, um ihn nicht doppelt zu bauen.)

export async function saveSmtpSettings(formData: FormData) {
  const supabase = await createClient();
  if (!(await isLoggedIn(supabase))) return { success: false, error: "Nicht angemeldet." };

  const host = formData.get("smtp_host")?.toString() || "";
  const port = formData.get("smtp_port")?.toString() || "587";
  const user = formData.get("smtp_user")?.toString() || "";
  const pass = formData.get("smtp_pass")?.toString() || "";
  const fromName = formData.get("smtp_from_name")?.toString() || "";
  const fromEmail = formData.get("smtp_from_email")?.toString() || "";
  const recipient = formData.get("smtp_recipient")?.toString() || "";

  const updatePayload: Record<string, string | null> = {
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
    try {
      updatePayload.smtp_pass = encrypt(pass);
    } catch (err) {
      console.error("SMTP password encryption failed:", err);
      return { success: false, error: /ENCRYPTION_KEY/i.test((err as Error)?.message || "") ? "Der ENCRYPTION_KEY fehlt oder ist ungültig (Vercel → Environment Variables). Das Passwort kann so nicht gespeichert werden." : "Das Passwort konnte nicht verschlüsselt werden." };
    }
  }

  // email_settings statt site_settings: SMTP-Zugangsdaten dürfen nicht öffentlich lesbar
  // sein (site_settings hat bewusst eine public-read RLS-Policy für Logo/Site-Name/Kontakt).
  const { error } = await supabase
    .from("email_settings")
    .upsert(updatePayload);

  if (error) {
    console.error("Failed to save SMTP settings to email_settings:", error);
    return { success: false, error: dbErrorMessage(error, "Speichern der SMTP-Einstellungen") };
  }

  revalidatePath("/admin/einstellungen");
  return { success: true };
}

/** Speichert „Website & Branding“. Nur die Felder aus GENERAL_SETTINGS_FIELDS, alles andere wird ignoriert. */
export async function saveGeneralSettings(payload: Partial<Record<GeneralSettingsField, unknown>>) {
  const supabase = await createClient();
  if (!(await isLoggedIn(supabase))) return { success: false, error: "Nicht angemeldet." };
  const { values, ignored } = sanitizeGeneralSettings(payload);
  if (ignored.length) console.warn(`[einstellungen] Unbekannte Felder ignoriert: ${ignored.join(", ")}`);
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      ...values,
      id: "general",
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Failed to save site settings:", error);
    return { success: false, error: dbErrorMessage(error, "Speichern der Einstellungen") };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateHeroImageSetting(fieldId: string, url: string | null) {
  const supabase = await createClient();
  if (!(await isLoggedIn(supabase))) return { success: false, error: "Nicht angemeldet." };
  // Nur projekteigene Bild-Spalten, keine Kern-Spalten (id, Name, Logo, Pop-up ...)
  if (!isAllowedImageSettingColumn(fieldId)) return { success: false, error: "Dieses Feld kann hier nicht gespeichert werden." };
  if (url !== null && typeof url !== "string") return { success: false, error: "Ungültige Bild-Adresse." };
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      id: "general",
      [fieldId]: url || null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error(`Failed to update hero setting ${fieldId}:`, error);
    return { success: false, error: dbErrorMessage(error, "Speichern des Bildes") };
  }

  // "layout" invalidiert den kompletten Seitenbaum - reicht projektübergreifend,
  // ohne einzelne kundenspezifische Routen (die hier vorher fest verdrahtet waren
  // und in anderen Projekten als reines No-op ins Leere liefen) fest zu verdrahten.
  revalidatePath("/", "layout");
  return { success: true };
}

/** Gespeicherte SMTP-Angaben für das Formular im Admin. Das Passwort verlässt den Server nie,
 *  nur ob eines gespeichert und lesbar ist (passStatus). Leer gelassen bleibt es beim Speichern erhalten. */
export async function getSmtpSettings(): Promise<SmtpFormValues & { missing: string[] }> {
  const supabase = await createClient();
  if (!(await isLoggedIn(supabase))) return { ...EMPTY_SMTP_VALUES, missing: [] };
  const { values, missing } = await loadSmtpSettings(supabase);
  return { ...values, missing };
}

/**
 * Sendet eine Test-E-Mail mit den GESPEICHERTEN SMTP-Einstellungen an den Empfänger für Anfragen.
 * Gleiche Prüfung wie der echte Versand (loadSmtpSettings): Klappt der Test, gehen auch Anfragen raus.
 */
export async function sendTestEmail(): Promise<{ success: true; to: string } | { success: false; error: string }> {
  const supabase = await createClient();
  if (!(await isLoggedIn(supabase))) return { success: false, error: "Nicht angemeldet." };

  const { config, missing } = await loadSmtpSettings(supabase);
  if (!config) {
    return { success: false, error: `Noch nicht vollständig, es fehlt: ${missing.join(", ")}. Ohne diese Angaben werden Anfragen nur im Posteingang gespeichert. Bitte ergänzen und speichern.` };
  }

  try {
    const provider = new SmtpEmailProvider({ host: config.host, port: config.port, user: config.user, pass: config.pass });
    await provider.send({
      to: config.recipient,
      subject: "Test-E-Mail aus dem Admin",
      html: "<p>Diese Test-E-Mail bestätigt, dass die E-Mail-Einstellungen funktionieren. Neue Anfragen kommen genauso an diese Adresse.</p>",
      fromName: config.fromName || undefined,
      fromEmail: config.fromEmail,
    });
    return { success: true, to: config.recipient };
  } catch (err) {
    console.error("SMTP test failed:", err);
    return { success: false, error: smtpErrorMessage(err as Error) };
  }
}
