// Versandart „Microsoft 365“ (ab v0.19.0): Auswertung von Prüfung und Fehlern, ohne Server-Code
// (Admin-Komponenten nutzen die Typen, Tests die Auswertung). Texte für den Admin, also „du“.
//
// Ergebnis im selben Format wie die SMTP-Prüfung (SmtpCheckResult, transport „microsoft365“). Die drei Schritte
// bedeuten hier:
//   server     = Tenant gefunden (Tenant-ID stimmt)
//   encryption = App angemeldet (Client-ID und Secret stimmen, Secret nicht abgelaufen)
//   login      = Senderecht (Mail.Send). Ohne echten Versand nur sichtbar, wenn es in Entra ID vergeben ist;
//                Rechte aus Exchange „RBAC for Applications“ stehen nicht im Token, dann „skip“.

import type { SmtpCheckResult } from "./smtp-check-types";

export interface GraphTarget {
  /** Absender-Postfach */
  sender: string;
  /** Ablaufdatum des Secrets (YYYY-MM-DD), falls eingetragen */
  secretExpiresAt?: string | null;
}

export type SecretExpiry =
  | { status: "unknown" }
  | { status: "ok" | "soon" | "expired"; days: number; date: string };

/** Warnen ab 30 Tagen vor Ablauf. */
export const SECRET_WARN_DAYS = 30;
/** Microsoft erlaubt höchstens 24 Monate. */
export const SECRET_MAX_MONTHS = 24;

/** Wie lange das Client-Secret noch gilt (Datum aus dem Admin, Microsoft verrät es ohne weitere Rechte nicht). */
export function secretExpiry(date: string | null | undefined, now = new Date()): SecretExpiry {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { status: "unknown" };
  const end = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  if (Number.isNaN(end)) return { status: "unknown" };
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((end - today) / 86_400_000);
  return { status: days < 0 ? "expired" : days <= SECRET_WARN_DAYS ? "soon" : "ok", days, date };
}

export function formatDateDe(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

/** Satz zum Ablauf des Secrets oder undefined, wenn alles in Ordnung ist. */
export function secretExpiryHint(date: string | null | undefined, now = new Date()): string | undefined {
  const e = secretExpiry(date, now);
  if (e.status === "unknown") return "Trag ein, bis wann das Client-Secret gilt, dann erinnert dich der Admin rechtzeitig vor dem Ablauf.";
  if (e.status === "expired") return `Das Client-Secret ist seit ${formatDateDe(e.date)} abgelaufen. Leg in Entra ID ein neues an und trag es hier ein.`;
  if (e.status === "soon")
    return `Das Client-Secret läuft ${e.days === 0 ? "heute" : e.days === 1 ? "morgen" : `in ${e.days} Tagen`} ab (${formatDateDe(e.date)}). Leg rechtzeitig in Entra ID ein neues an und trag es hier ein, sonst gehen keine E-Mails mehr raus.`;
  return undefined;
}

function base(t: GraphTarget, now: Date) {
  return { checkedAt: now.toISOString(), transport: "microsoft365" as const, mailbox: t.sender, ...(t.secretExpiresAt ? { secretExpiresAt: t.secretExpiresAt } : {}) };
}

/**
 * Token erhalten. `roles` aus dem Token: Steht Mail.Send darin, ist das Senderecht in Entra ID vergeben
 * (dann unbedingt per Application Access Policy oder RBAC auf das Postfach beschränken). Fehlt es, kommt das Recht
 * hoffentlich aus Exchange-RBAC, was sich ohne Versand nicht prüfen lässt.
 */
export function graphOkResult(t: GraphTarget, roles: string[], now = new Date()): SmtpCheckResult {
  const entraMailSend = roles.includes("Mail.Send");
  const expiry = secretExpiryHint(t.secretExpiresAt, now);
  const exp = secretExpiry(t.secretExpiresAt, now);
  const hints = [
    entraMailSend
      ? "Das Senderecht kommt aus Entra ID und gilt dort für alle Postfächer. Stell sicher, dass die App in Exchange per Application Access Policy auf das Absender-Postfach beschränkt ist (Anleitung bei WNT-IT)."
      : "Das Senderecht vergibt Exchange („RBAC for Applications“), das lässt sich ohne Versand nicht prüfen. Ob das Postfach senden darf, zeigt die Test-E-Mail.",
    expiry,
  ].filter(Boolean);
  return {
    ...base(t, now),
    ok: exp.status !== "expired",
    steps: { server: "ok", encryption: "ok", login: entraMailSend ? "ok" : "skip" },
    ...(exp.status === "expired" ? { problem: "secret-expired" as const } : {}),
    ...(exp.status === "soon" ? { secretExpiresSoon: true } : {}),
    message: entraMailSend
      ? "Anmeldung bei Microsoft 365 klappt, die App darf E-Mails senden."
      : "Anmeldung bei Microsoft 365 klappt.",
    hint: hints.join(" "),
  };
}

/** Fehler beim Token holen oder Senden (GraphMailError) in Schritt, Problem und Erklärung übersetzen. */
export function classifyGraphError(err: unknown, t: GraphTarget, now = new Date()): SmtpCheckResult {
  const e = (err ?? {}) as { stage?: "token" | "send"; status?: number; code?: string; aadsts?: number[]; message?: string };
  const codes = e.aadsts ?? [];
  const msg = e.message ?? "";
  const aad = (n: number) => codes.includes(n) || new RegExp(`AADSTS${n}\\b`).test(msg);
  const b = { ...base(t, now), ok: false as const };
  const tenantFail = { server: "fail", encryption: "skip", login: "skip" } as const;
  const appFail = { server: "ok", encryption: "fail", login: "skip" } as const;
  const sendFail = { server: "ok", encryption: "ok", login: "fail" } as const;

  if (e.code === "network" || e.code === "timeout") {
    return { ...b, steps: { server: "fail", encryption: "skip", login: "skip" }, problem: e.code === "timeout" ? "timeout" : "other", message: "Microsoft ist gerade nicht erreichbar.", hint: "Bitte in ein paar Minuten erneut prüfen." };
  }

  if (e.stage !== "send") {
    if (e.code === "invalid_tenant_format" || aad(90002) || aad(900023) || aad(90013)) {
      return { ...b, steps: tenantFail, problem: "ms-tenant", message: "Den Microsoft-Tenant gibt es so nicht.", hint: "Bitte die Tenant-ID prüfen: Entra ID → Übersicht → „Mandanten-ID“ (eine GUID) oder die Domain, z. B. firma.onmicrosoft.com." };
    }
    if (aad(700016)) {
      return { ...b, steps: { server: "ok", encryption: "fail", login: "skip" }, problem: "ms-app", message: "Die App ist in diesem Tenant nicht bekannt.", hint: "Bitte die Client-ID (Anwendungs-ID) prüfen und ob die App im richtigen Tenant registriert ist." };
    }
    if (aad(7000222)) {
      return { ...b, steps: appFail, problem: "secret-expired", message: "Das Client-Secret ist abgelaufen.", hint: "Leg in Entra ID unter „Zertifikate & Geheimnisse“ ein neues an, trag den Wert und das neue Ablaufdatum hier ein." };
    }
    if (aad(7000215) || e.code === "invalid_client" || e.code === "unauthorized_client") {
      return {
        ...b,
        steps: appFail,
        problem: "auth",
        message: "Microsoft hat das Client-Secret abgelehnt.",
        hint: "Häufigster Fehler: die „Geheimnis-ID“ statt des „Werts“ kopiert. Der Wert ist nur direkt nach dem Anlegen sichtbar, sonst ein neues Secret anlegen.",
      };
    }
    if (aad(7000112) || aad(700005)) {
      return { ...b, steps: appFail, problem: "ms-app", message: "Die App ist im Tenant deaktiviert.", hint: "Bitte in Entra ID unter „Unternehmensanwendungen“ die Anmeldung für die App wieder erlauben." };
    }
    if (aad(53003) || aad(53000)) {
      return { ...b, steps: appFail, problem: "ms-app", message: "Eine Richtlinie für bedingten Zugriff blockiert die App.", hint: "Die App braucht eine Ausnahme in der Richtlinie (Entra ID → Bedingter Zugriff)." };
    }
    return { ...b, steps: appFail, problem: "other", message: `Anmeldung bei Microsoft fehlgeschlagen${msg ? `: ${msg.slice(0, 200)}` : "."}` };
  }

  // Versand (Token war in Ordnung)
  const code = e.code ?? "";
  if (e.status === 403 || /AccessDenied|Authorization_RequestDenied/i.test(code)) {
    return {
      ...b,
      steps: sendFail,
      problem: "ms-permission",
      message: `Die App darf aus „${t.sender}“ nicht senden.`,
      hint: "Prüf in Exchange, ob die App die Rolle „Application Mail.Send“ für genau dieses Postfach hat (RBAC for Applications), bzw. in Entra ID die Anwendungsberechtigung Mail.Send mit Administratorzustimmung und eine Application Access Policy, die dieses Postfach enthält. Neue Rechte wirken erst nach bis zu 2 Stunden.",
    };
  }
  if (e.status === 404 || /ErrorInvalidUser|ResourceNotFound|MailboxNotEnabledForRESTAPI|ErrorNonExistentMailbox/i.test(code)) {
    return { ...b, steps: sendFail, problem: "ms-mailbox", message: `Das Postfach „${t.sender}“ wurde nicht gefunden.`, hint: "Bitte die Adresse des Absender-Postfachs prüfen. Es muss ein Postfach in Exchange Online sein (Benutzer- oder freigegebenes Postfach), keine Verteilerliste." };
  }
  if (/ErrorInvalidRecipients|ErrorInvalidEmailAddress/i.test(code) || (e.status === 400 && /recipient/i.test(msg))) {
    return { ...b, steps: { server: "ok", encryption: "ok", login: "ok" }, problem: "other", message: "Microsoft hat die Empfängeradresse abgelehnt.", hint: "Bitte den Empfänger für Anfragen prüfen." };
  }
  if (e.status === 429) {
    return { ...b, steps: { server: "ok", encryption: "ok", login: "ok" }, problem: "other", message: "Microsoft bremst gerade zu viele E-Mails.", hint: "Bitte etwas später erneut versuchen." };
  }
  if (e.status === 401) {
    return { ...b, steps: appFail, problem: "auth", message: "Microsoft hat die Anmeldung der App beim Senden abgelehnt.", hint: "Bitte erneut prüfen. Bleibt der Fehler, ein neues Client-Secret anlegen." };
  }
  return { ...b, steps: { server: "ok", encryption: "ok", login: "skip" }, problem: "other", message: `Der Versand über Microsoft 365 ist fehlgeschlagen${msg ? `: ${msg.slice(0, 200)}` : "."}` };
}
