// Single Source of Truth für die Core-Version und den Changelog, der im Admin
// unter /admin/version angezeigt wird. Beim Release VOR dem Tag pflegen:
// CORE_VERSION erhöhen, neuen Eintrag ganz oben in CORE_CHANGELOG ergänzen
// und die Version in package.json angleichen.

export type ChangeType = "feature" | "fix" | "security" | "docs";

export interface ChangelogEntry {
  version: string;
  /** ISO-Datum (YYYY-MM-DD) */
  date: string;
  changes: { type: ChangeType; text: string }[];
}

export const CORE_VERSION = "0.9.1";

/** Neueste Version zuerst. */
export const CORE_CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.9.1",
    date: "2026-10-28",
    changes: [
      { type: "security", text: "Das Paket für den E-Mail-Versand über Resend ist auf Version 6 aktualisiert. Damit sind die gemeldeten Sicherheitswarnungen (deepmerge) behoben. Am Versand selbst ändert sich nichts." },
    ],
  },
  {
    version: "0.9.0",
    date: "2026-10-28",
    changes: [
      { type: "feature", text: "Neues Design der ganzen Verwaltung (WNT-Backend) in den Farben von WNT-IT: Seitenleiste mit „Inhalte“ und „System“, Handy-Menü, einheitliche Seiten mit Erklärung links und Feldern rechts, Speichern-Leiste unten und Löschen mit Rückfrage." },
      { type: "feature", text: "Anmelden, Passwort, Mein Konto, Einstellungen, SMTP, Posteingang, Mediathek und Core-Version sind neu gestaltet. Der Posteingang zeigt Anfragen als Tabelle oder auf dem Handy als Karten, mit Detailansicht, Suche und Filtern." },
      { type: "feature", text: "Alle Auswahlfelder sind jetzt eigene, moderne Aufklappmenüs mit Suche (bei langen Listen), Gruppen und Tastaturbedienung, statt der Browser-Liste." },
      { type: "feature", text: "Neues Bildfeld für mehrere Bilder (Galerie): Bilder hochladen oder aus der Mediathek wählen, per Ziehen sortieren, das erste ist das Hauptbild." },
      { type: "feature", text: "Neue Seite „Pop-up“: ein Bild als Hinweis beim Öffnen der Website, z. B. für Aktionen oder Betriebsferien, pro Besuch einmal. Braucht einmal die Datenbank-Erweiterung sql/0.9.0_site_popup.sql." },
      { type: "fix", text: "Mediathek: Das Fenster „Neuer Ordner“ bzw. „Umbenennen“ schließt sich nach dem Speichern wieder." },
      { type: "fix", text: "Posteingang: Der Filter nach Formular findet die Anfragen jetzt auch, wenn das Formular einen Zusatz trägt (z. B. Abteilung)." },
      { type: "fix", text: "Core-Seiten zeigen im Browser-Tab ihren eigenen Namen statt „Admin Dashboard“ (im Projekt generateCoreAdminMetadata im Catch-all einbinden)." },
    ],
  },
  {
    version: "0.8.2",
    date: "2026-10-26",
    changes: [
      { type: "fix", text: "Passwort ändern: Wenn das neue Passwort abgelehnt wird, steht jetzt der Grund da (z. B. fehlende Groß-/Kleinbuchstaben, Ziffer oder Sonderzeichen, gleich wie das alte, aus Datenlecks bekannt). Bisher stand nur „Fehler beim Ändern des Passworts“. Die Regeln stehen außerdem unter dem Passwortfeld." },
      { type: "fix", text: "Anmeldung, „Passwort vergessen“, E-Mail-Adresse ändern und Links aus E-Mails: Fehlermeldungen sind jetzt auf Deutsch und nennen die Ursache (zu viele Versuche, Link abgelaufen, Mail nicht bestätigt, Konto gesperrt und weitere)." },
      { type: "fix", text: "Einstellungen: Beim Test-Mailversand und beim Speichern erscheinen verständliche Hinweise, z. B. Benutzer oder Passwort vom Mailserver abgelehnt, Server nicht gefunden, Port oder Verschlüsselung passen nicht, fehlende Berechtigung." },
    ],
  },
  {
    version: "0.8.1",
    date: "2026-10-22",
    changes: [
      { type: "fix", text: "Kontaktformular: Anfragen von nicht angemeldeten Besuchern werden wieder gespeichert. Bisher scheiterte das Speichern mit einem Rechtefehler, weil die neue Anfrage direkt wieder gelesen wurde, was Besucher nicht dürfen. Angemeldete Admins waren nicht betroffen." },
      { type: "security", text: "Das E-Mail-Paket (nodemailer) wurde auf Version 10 aktualisiert und schließt mehrere bekannte Sicherheitslücken." },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-10-11",
    changes: [
      { type: "feature", text: "Bilder werden beim Hochladen automatisch verkleinert (höchstens 2000 Pixel, WebP). Das spart Ladezeit und Speicherplatz. PDF, SVG und GIF bleiben unverändert." },
      { type: "feature", text: "Hochgeladene Dateien werden ein Jahr lang zwischengespeichert, die Seite lädt bei Wiederbesuchen schneller." },
      { type: "feature", text: "Die Bild-Einstellungen für Next.js kommen zentral aus dem Core (withCoreCms) und müssen nicht mehr in jedem Projekt gepflegt werden." },
      { type: "docs", text: "Bereits hochgeladene Bilder bleiben unverändert und werden erst beim erneuten Hochladen verkleinert." },
    ],
  },
  {
    version: "0.7.1",
    date: "2026-10-06",
    changes: [
      { type: "fix", text: "Admin-Leiste: Die Schnellzugriffe verursachten einen Fehler (500), wenn sie aus dem Layout einer Seite übergeben wurden. Icons werden jetzt als fertige Elemente übergeben (z. B. <Inbox size={16} />)." },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-10-06",
    changes: [
      { type: "feature", text: "Neue Admin-Leiste für die öffentliche Website: Wer angemeldet ist, sieht unten einen Button zum Dashboard, ein Menü mit Schnellzugriffen und „Abmelden“. Einbau mit einer Zeile im Layout." },
      { type: "security", text: "E-Mails zu Formularanfragen übernehmen Eingaben nicht mehr als HTML – Schutz vor eingeschleusten Links und Texten." },
      { type: "security", text: "Weiterleitung nach dem Anmelden/Passwort-Zurücksetzen erlaubt nur noch interne Seiten." },
      { type: "security", text: "Einstellungen (E-Mail, Website, Bilder) lassen sich nur noch angemeldet ändern und auslesen." },
      { type: "security", text: "Das E-Mail-Passwort wird nur noch mit dem projekteigenen ENCRYPTION_KEY verschlüsselt, es gibt keinen Ersatzschlüssel mehr. Der Wert muss pro Projekt gesetzt sein." },
      { type: "security", text: "Passwörter müssen jetzt mindestens 10 Zeichen lang sein." },
      { type: "feature", text: "Neue Anfragen im Posteingang springen beim Öffnen automatisch auf „In Bearbeitung“." },
      { type: "feature", text: "Medienbibliothek warnt vor dem Hochladen von Dateien über 5 MB." },
      { type: "docs", text: "Aufgeräumt: Version in package.json und README angeglichen, ungenutztes Paket entfernt." },
      { type: "feature", text: "Die Admin-Leiste zeigt die Zahl neuer Anfragen im Posteingang an." },
      { type: "feature", text: "Core-Version-Seite zeigt jetzt, ob eine neuere Version verfügbar ist." },
      { type: "feature", text: "Bei den E-Mail-Einstellungen gibt es einen Button „Test-E-Mail senden“, um die Einstellungen sofort zu prüfen." },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-10-05",
    changes: [
      { type: "feature", text: "Neue Admin-Seite „Core-Version“: zeigt die installierte Core-Version und den Changelog." },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-10-04",
    changes: [
      { type: "fix", text: "Formularversand nutzt nur noch die im Admin hinterlegten E-Mail-Einstellungen – keine versteckten Fallbacks mehr." },
      { type: "docs", text: "Dokumentation an den reinen Admin-SMTP-Betrieb angepasst." },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-09-27",
    changes: [
      { type: "feature", text: "Neue Admin-Seiten des Core erscheinen automatisch in allen Projekten (coreAdminPages)." },
    ],
  },
  {
    version: "0.3.1",
    date: "2026-09-26",
    changes: [
      { type: "security", text: "SMTP-Zugangsdaten werden nicht mehr in öffentlich lesbaren Einstellungen gespeichert." },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-25",
    changes: [
      { type: "feature", text: "„Mein Konto“: Admins können ihre eigene E-Mail-Adresse und ihr Passwort ändern." },
    ],
  },
];
