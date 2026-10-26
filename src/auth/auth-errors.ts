// Übersetzt Fehler von Supabase Auth (und Mailversand) in verständliche deutsche Meldungen.
// Bewusst keine 'use server'-Datei: reine Hilfsfunktionen, von den Server Actions genutzt.

export const PASSWORD_RULES_HINT =
  'Mindestens 10 Zeichen, mit Groß- und Kleinbuchstaben, einer Ziffer und einem Sonderzeichen.'

type AuthErrorLike = {
  code?: string
  message?: string
  status?: number
  reasons?: string[]
} | null | undefined

function weakPasswordMessage(error: NonNullable<AuthErrorLike>): string {
  const reasons = error.reasons || []
  const pwned = reasons.includes('pwned')
  const rules = reasons.includes('length') || reasons.includes('characters') || reasons.length === 0
  if (pwned && !rules) return 'Dieses Passwort ist aus bekannten Datenlecks bekannt und deshalb nicht erlaubt. Bitte ein anderes wählen.'
  return `Das Passwort ist nicht sicher genug. ${PASSWORD_RULES_HINT}${pwned ? ' Es ist außerdem aus bekannten Datenlecks bekannt.' : ''}`
}

/**
 * Meldung für einen Supabase-Auth-Fehler. `fallback` erscheint nur, wenn der Fehler
 * nicht bekannt ist (die Ursache steht dann im Serverlog).
 */
export function authErrorMessage(error: AuthErrorLike, fallback: string): string {
  if (!error) return fallback
  const code = error.code || ''
  const msg = (error.message || '').toLowerCase()

  if (code === 'weak_password') return weakPasswordMessage(error)
  if (code === 'same_password' || msg.includes('different from the old password')) {
    return 'Das neue Passwort muss sich vom bisherigen unterscheiden.'
  }
  if (code === 'invalid_credentials' || msg === 'invalid login credentials') {
    return 'Zugangsdaten sind ungültig.'
  }
  if (code === 'email_not_confirmed') {
    return 'Die E-Mail-Adresse wurde noch nicht bestätigt. Bitte den Link in der Bestätigungsmail öffnen.'
  }
  if (code === 'user_banned') return 'Dieses Konto ist gesperrt.'
  if (code === 'user_not_found') return 'Zu dieser Adresse gibt es kein Konto.'
  if (code === 'email_exists' || code === 'user_already_exists') {
    return 'Diese E-Mail-Adresse wird bereits verwendet.'
  }
  if (code === 'email_address_invalid' || code === 'validation_failed') {
    return 'Die E-Mail-Adresse ist ungültig.'
  }
  if (code === 'over_request_rate_limit' || error.status === 429) {
    return 'Zu viele Versuche. Bitte einige Minuten warten und dann erneut versuchen.'
  }
  if (code === 'over_email_send_rate_limit' || msg.includes('email rate limit')) {
    return 'Es wurden zu viele E-Mails gesendet. Bitte etwa eine Stunde warten und dann erneut versuchen.'
  }
  if (code === 'otp_expired' || code === 'flow_state_expired' || code === 'flow_state_not_found') {
    return 'Der Link ist abgelaufen oder wurde schon benutzt. Bitte einen neuen Link anfordern.'
  }
  if (code === 'session_expired' || code === 'session_not_found' || code === 'bad_jwt' || msg.includes('auth session missing')) {
    return 'Die Sitzung ist abgelaufen. Bitte neu anmelden.'
  }
  if (code === 'reauthentication_needed') {
    return 'Aus Sicherheitsgründen bitte neu anmelden und es dann erneut versuchen.'
  }
  if (code === 'unexpected_failure' && msg.includes('sending')) {
    return 'Die E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen oder den Mailserver in Supabase prüfen.'
  }
  if (msg.includes('error sending') && msg.includes('email')) {
    return 'Die E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen oder den Mailserver in Supabase prüfen.'
  }
  if (msg.includes('fetch failed') || msg.includes('network')) {
    return 'Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.'
  }
  return fallback
}

/** Meldung für einen fehlgeschlagenen Mailversand über SMTP (nodemailer). */
export function smtpErrorMessage(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; message?: string } | null
  const code = e?.code || ''
  if (code === 'EAUTH' || e?.responseCode === 535) {
    return 'Der Mailserver hat Benutzer oder Passwort abgelehnt. Bitte die Zugangsdaten prüfen.'
  }
  if (code === 'ENOTFOUND' || code === 'EDNS') {
    return 'Der Mailserver wurde nicht gefunden. Bitte den Servernamen prüfen.'
  }
  if (code === 'ECONNREFUSED') {
    return 'Der Mailserver nimmt unter diesem Port keine Verbindung an. Bitte Port (meist 465 oder 587) prüfen.'
  }
  if (code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION' || code === 'ECONNRESET') {
    return 'Die Verbindung zum Mailserver ist fehlgeschlagen oder hat zu lange gedauert. Bitte Server und Port prüfen.'
  }
  if (code === 'EENVELOPE' || e?.responseCode === 550 || e?.responseCode === 553) {
    return 'Der Mailserver hat Absender- oder Empfängeradresse abgelehnt. Bitte beide Adressen prüfen.'
  }
  if (code === 'ESTREAM' || /wrong version number|ssl|tls/i.test(e?.message || '')) {
    return 'Die verschlüsselte Verbindung zum Mailserver ist fehlgeschlagen. Meist passen Port und Verschlüsselung nicht zusammen (465 = SSL, 587 = STARTTLS).'
  }
  return 'Der Versand ist fehlgeschlagen' + (e?.message ? `: ${e.message}` : '.')
}

/** Meldung für einen fehlgeschlagenen Datenbank-Zugriff (Supabase/Postgres). */
export function dbErrorMessage(error: { code?: string; message?: string } | null | undefined, what: string): string {
  const code = error?.code || ''
  const msg = (error?.message || '').toLowerCase()
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return `${what}: keine Berechtigung. Bitte neu anmelden; besteht das Problem weiter, die Datenbank-Rechte prüfen.`
  }
  if (code === 'PGRST301' || msg.includes('jwt expired')) {
    return 'Die Sitzung ist abgelaufen. Bitte neu anmelden.'
  }
  if (code === '23505') return `${what}: Dieser Eintrag existiert bereits.`
  if (code === '23503') return `${what}: Der Eintrag ist noch mit anderen Daten verknüpft.`
  if (code === '23502') return `${what}: Ein Pflichtfeld ist leer.`
  if (code === '22001') return `${what}: Ein Text ist zu lang.`
  if (msg.includes('fetch failed') || msg.includes('network')) {
    return 'Keine Verbindung zur Datenbank. Bitte Internetverbindung prüfen und erneut versuchen.'
  }
  return `${what} fehlgeschlagen${error?.message ? ` (${error.message})` : '.'}`
}
