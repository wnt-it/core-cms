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

export const CORE_VERSION = "0.7.1";

/** Neueste Version zuerst. */
export const CORE_CHANGELOG: ChangelogEntry[] = [
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
