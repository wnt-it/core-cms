// Ergebnis der Verbindungsprüfung zum Mailserver und Auswertung der Fehler (ohne Server-Code,
// damit Admin-Komponenten die Typen nutzen und Tests die Auswertung prüfen können).
// Texte für den Admin, also „du“.

export type SmtpCheckStep = "ok" | "fail" | "skip";

export type SmtpProblem =
  | "incomplete"
  | "dns"
  | "refused"
  | "timeout"
  | "tls-mode"
  | "no-tls"
  | "cert-name"
  | "cert-expired"
  | "cert-not-yet-valid"
  | "cert-self-signed"
  | "cert-untrusted"
  | "auth"
  // Microsoft 365 (ab v0.19.0, graph-check-types.ts)
  | "ms-tenant"
  | "ms-app"
  | "ms-permission"
  | "ms-mailbox"
  | "secret-expired"
  | "other";

export interface SmtpCheckResult {
  ok: boolean;
  /** Versandart (ab v0.19.0). Fehlt = SMTP. Bei „microsoft365“ heißen die Schritte: Tenant gefunden, App angemeldet, Senderecht. */
  transport?: "smtp" | "microsoft365";
  /** Microsoft 365: Absender-Postfach */
  mailbox?: string;
  /** Microsoft 365: Ablaufdatum des Client-Secrets (YYYY-MM-DD), falls eingetragen */
  secretExpiresAt?: string;
  /** Microsoft 365: Secret läuft in den nächsten 30 Tagen ab */
  secretExpiresSoon?: boolean;
  /** ISO-Zeitpunkt der Prüfung */
  checkedAt: string;
  host?: string;
  port?: number;
  steps: { server: SmtpCheckStep; encryption: SmtpCheckStep; login: SmtpCheckStep };
  problem?: SmtpProblem;
  /** Ein Satz, was los ist */
  message: string;
  /** Was du tun kannst */
  hint?: string;
  /** Bei „cert-name“: Servernamen, für die das Zertifikat gilt */
  certNames?: string[];
  /** Prüfung des Zertifikats ist in den Einstellungen ausgeschaltet */
  certCheckSkipped?: boolean;
  /** Ergebnis aus den letzten 10 Minuten, nicht neu geprüft */
  cached?: boolean;
}

interface Target {
  host: string;
  port: number;
  skipCertCheck?: boolean;
}

const CERT_SWITCH_HINT =
  "Nur wenn das ein eigener Server ist, dem du vertraust, kannst du unter „Server-Einstellungen“ die Prüfung des Zertifikats ausschalten.";

export function okResult(t: Target, now = new Date()): SmtpCheckResult {
  return {
    ok: true,
    checkedAt: now.toISOString(),
    host: t.host,
    port: t.port,
    steps: { server: "ok", encryption: "ok", login: "ok" },
    message: "Verbindung steht: Server erreichbar, Verbindung verschlüsselt, Anmeldung erfolgreich.",
    ...(t.skipCertCheck
      ? { certCheckSkipped: true, hint: "Die Prüfung des Zertifikats ist ausgeschaltet. Die Verbindung ist verschlüsselt, aber nicht gegen gefälschte Server geschützt." }
      : {}),
  };
}

export function incompleteResult(missing: string[], now = new Date()): SmtpCheckResult {
  return {
    ok: false,
    checkedAt: now.toISOString(),
    steps: { server: "skip", encryption: "skip", login: "skip" },
    problem: "incomplete",
    message: `Noch nicht vollständig, es fehlt: ${missing.join(", ")}.`,
    hint: "Ohne diese Angaben werden Anfragen nur im Posteingang gespeichert.",
  };
}

/** Servernamen aus der Meldung „… is not in the cert's altnames: DNS:a, DNS:b“ bzw. aus err.cert. */
function certNamesFrom(e: { message?: string; cert?: { subjectaltname?: string; subject?: { CN?: string } } }): string[] {
  const raw = e.cert?.subjectaltname ?? e.message?.match(/altnames:\s*((?:DNS|IP Address):.+)$/i)?.[1] ?? "";
  const names = raw
    .split(/,\s*/)
    .map((s) => s.replace(/^(DNS|IP Address):/i, "").trim())
    .filter(Boolean);
  if (!names.length && e.cert?.subject?.CN) names.push(e.cert.subject.CN);
  return [...new Set(names)].slice(0, 6);
}

/** Fehler von nodemailer/Node (verify oder Versand) in Schritt, Problem und Erklärung übersetzen. */
export function classifySmtpError(err: unknown, t: Target, now = new Date()): SmtpCheckResult {
  const e = (err ?? {}) as { code?: string; originalCode?: string; responseCode?: number; message?: string; cert?: { subjectaltname?: string; subject?: { CN?: string } } };
  const code = e.code ?? "";
  const orig = e.originalCode ?? "";
  const msg = e.message ?? "";
  const base = { ok: false as const, checkedAt: now.toISOString(), host: t.host, port: t.port, ...(t.skipCertCheck ? { certCheckSkipped: true } : {}) };
  const serverFail = { server: "fail", encryption: "skip", login: "skip" } as const;
  const tlsFail = { server: "ok", encryption: "fail", login: "skip" } as const;
  const has = (re: RegExp) => re.test(orig) || re.test(msg) || re.test(code);

  // Zertifikat
  if (has(/ERR_TLS_CERT_ALTNAME_INVALID|does not match certificate'?s altnames|not in the cert'?s (altnames|list)/i)) {
    const certNames = certNamesFrom(e);
    return {
      ...base,
      steps: tlsFail,
      problem: "cert-name",
      certNames,
      message: `Das Zertifikat des Mailservers gilt nicht für „${t.host}“.`,
      hint: certNames.length
        ? `Es gilt für: ${certNames.join(", ")}. Trag am besten genau diesen Servernamen ein, oft ist das der Name deines Mail-Anbieters statt deiner eigenen Domain.`
        : "Frag deinen Mail-Anbieter nach dem richtigen Servernamen für den Postausgang (SMTP).",
    };
  }
  if (has(/CERT_HAS_EXPIRED|certificate has expired/i)) {
    return { ...base, steps: tlsFail, problem: "cert-expired", message: "Das Zertifikat des Mailservers ist abgelaufen.", hint: `Das muss dein Mail-Anbieter erneuern. Bis dahin gehen keine E-Mails raus. ${CERT_SWITCH_HINT}` };
  }
  if (has(/CERT_NOT_YET_VALID|certificate is not yet valid/i)) {
    return { ...base, steps: tlsFail, problem: "cert-not-yet-valid", message: "Das Zertifikat des Mailservers ist noch nicht gültig.", hint: "Meist ein Fehler beim Mail-Anbieter. Bitte dort melden." };
  }
  if (has(/SELF_SIGNED|self[- ]signed/i)) {
    return {
      ...base,
      steps: tlsFail,
      problem: "cert-self-signed",
      message: "Der Mailserver nutzt ein selbst ausgestelltes Zertifikat, das sich nicht überprüfen lässt.",
      hint: `Frag deinen Mail-Anbieter nach dem richtigen Servernamen. ${CERT_SWITCH_HINT}`,
    };
  }
  if (has(/UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER|unable to verify|unable to get (local )?issuer|CERT_UNTRUSTED|CERT_SIGNATURE_FAILURE|certificate signature failure/i)) {
    return {
      ...base,
      steps: tlsFail,
      problem: "cert-untrusted",
      message: "Das Zertifikat des Mailservers ist nicht vertrauenswürdig (unbekannter Aussteller oder unvollständige Kette).",
      hint: `Meist muss der Mail-Anbieter das beheben. ${CERT_SWITCH_HINT}`,
    };
  }

  // Erreichbarkeit
  if (code === "EDNS" || orig === "ENOTFOUND" || code === "ENOTFOUND" || /ENOTFOUND|EAI_AGAIN/.test(msg)) {
    return { ...base, steps: serverFail, problem: "dns", message: `Der Mailserver „${t.host}“ wurde nicht gefunden.`, hint: "Bitte den Servernamen prüfen, z. B. smtp.ionos.de." };
  }
  if (orig === "ECONNREFUSED" || code === "ECONNREFUSED" || /ECONNREFUSED/.test(msg)) {
    return { ...base, steps: serverFail, problem: "refused", message: `Der Mailserver nimmt unter Port ${t.port} keine Verbindung an.`, hint: "Meist ist der Port 465 oder 587." };
  }

  // Verschlüsselung
  if (/STARTTLS/i.test(msg) && (code === "ETLS" || code === "ECONNECTION")) {
    return {
      ...base,
      steps: tlsFail,
      problem: "no-tls",
      message: "Der Mailserver bietet unter diesem Port keine verschlüsselte Verbindung an.",
      hint: "Ohne Verschlüsselung würde das Passwort lesbar übertragen, deshalb sendet die Website so nicht. Bitte Port 465 oder 587 verwenden.",
    };
  }
  if (/wrong version number|packet length too long|ssl3_get_record|unknown protocol|tlsv1 alert|handshake failure|EPROTO/i.test(msg + " " + orig) || code === "ETLS") {
    return { ...base, steps: tlsFail, problem: "tls-mode", message: "Die verschlüsselte Verbindung kam nicht zustande.", hint: "Meist passen Port und Verschlüsselung nicht zusammen: 465 = SSL/TLS, 587 = STARTTLS." };
  }

  // Zeitüberschreitung
  if (code === "ETIMEDOUT" || orig === "ETIMEDOUT" || /timeout|timed out|Greeting never received/i.test(msg)) {
    return { ...base, steps: serverFail, problem: "timeout", message: "Der Mailserver antwortet nicht.", hint: `Bitte Servername und Port prüfen. ${t.port === 25 ? "Port 25 ist bei Vercel gesperrt, bitte 465 oder 587 nehmen." : ""}`.trim() };
  }

  // Anmeldung
  if (code === "EAUTH" || e.responseCode === 535 || e.responseCode === 534 || /authentication|auth.*fail|invalid login|username and password/i.test(msg)) {
    return {
      ...base,
      steps: { server: "ok", encryption: "ok", login: "fail" },
      problem: "auth",
      message: "Der Mailserver hat Benutzername oder Passwort abgelehnt.",
      hint: "Bitte die Zugangsdaten prüfen. Manche Anbieter brauchen ein eigenes App-Passwort für den Versand.",
    };
  }

  if (code === "ESOCKET" || code === "ECONNECTION" || orig === "ECONNRESET") {
    return { ...base, steps: serverFail, problem: "other", message: "Die Verbindung zum Mailserver ist abgebrochen.", hint: "Bitte Servername und Port prüfen und es erneut versuchen." };
  }
  return { ...base, steps: { server: "skip", encryption: "skip", login: "skip" }, problem: "other", message: `Die Prüfung ist fehlgeschlagen${msg ? `: ${msg.slice(0, 200)}` : "."}` };
}
