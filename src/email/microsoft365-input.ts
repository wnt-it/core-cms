// Eingaben für die Versandart „Microsoft 365“ (ab v0.19.0) vor dem Speichern prüfen. Reine Logik, getestet.
// Leere Felder sind erlaubt (halb ausgefüllt speichern geht, die Einstellungen zeigen dann, was fehlt),
// ausgefüllte müssen das richtige Format haben: Die Tenant-ID wird Teil der Anmelde-Adresse bei Microsoft.

import { isValidClientId, isValidTenantId } from "./graph-provider";
import { SECRET_MAX_MONTHS } from "./graph-check-types";

export interface Microsoft365Input {
  transport: "smtp" | "microsoft365";
  tenantId: string;
  clientId: string;
  sender: string;
  /** YYYY-MM-DD oder leer */
  secretExpiresAt: string;
}

export type Microsoft365Payload = {
  mail_transport: "smtp" | "microsoft365";
  ms_tenant_id: string | null;
  ms_client_id: string | null;
  ms_sender: string | null;
  ms_secret_expires_at: string | null;
};

const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

export function validateMicrosoft365Input(input: Microsoft365Input, now = new Date()): { ok: true; value: Microsoft365Payload } | { ok: false; error: string } {
  const tenantId = input.tenantId.trim();
  const clientId = input.clientId.trim();
  const sender = input.sender.trim();
  const expires = input.secretExpiresAt.trim();

  if (tenantId && !isValidTenantId(tenantId)) return { ok: false, error: "Die Tenant-ID ist ungültig. Erwartet wird eine GUID (Mandanten-ID) oder eine Domain wie firma.onmicrosoft.com." };
  if (clientId && !isValidClientId(clientId)) return { ok: false, error: "Die Client-ID ist ungültig. Erwartet wird die Anwendungs-ID (GUID) der App-Registrierung." };
  if (sender && !EMAIL.test(sender)) return { ok: false, error: "Das Absender-Postfach muss eine E-Mail-Adresse sein, z. B. anfragen@firma.de." };
  if (expires) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || Number.isNaN(Date.parse(`${expires}T00:00:00Z`))) return { ok: false, error: "Das Ablaufdatum des Secrets ist ungültig." };
    const max = new Date(Date.UTC(now.getFullYear(), now.getMonth() + SECRET_MAX_MONTHS + 1, now.getDate()));
    if (Date.parse(`${expires}T00:00:00Z`) > max.getTime()) return { ok: false, error: `Microsoft erlaubt Client-Secrets höchstens ${SECRET_MAX_MONTHS} Monate. Bitte das Ablaufdatum aus Entra ID übernehmen.` };
  }
  return {
    ok: true,
    value: {
      mail_transport: input.transport,
      ms_tenant_id: tenantId || null,
      ms_client_id: clientId || null,
      ms_sender: sender || null,
      ms_secret_expires_at: expires || null,
    },
  };
}
