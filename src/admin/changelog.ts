// Einzige Quelle für die Core-Version und den Changelog unter /admin/version.
// Für einen Release nur oben in CORE_CHANGELOG einen neuen Eintrag ergänzen und
// `npm run release` ausführen: Das Skript liest Version und Release-Notes von hier,
// setzt package.json und legt Tag und GitHub-Release an.

export type ChangeType = "feature" | "fix" | "security" | "docs";

export interface ChangelogEntry {
  version: string;
  /** ISO-Datum (YYYY-MM-DD) */
  date: string;
  changes: { type: ChangeType; text: string }[];
  /** Nur für die GitHub-Release-Notes, nicht im Admin: z. B. Breaking Changes mit Migration. */
  releaseNotes?: string;
}

/** Neueste Version zuerst. */
export const CORE_CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.12.0",
    date: "2026-11-05",
    changes: [
      { type: "feature", text: "Neue Seiten zum Bearbeiten der Rechtstexte im Admin: „Datenschutzerklärung“ als Text (Überschriften mit ihren Texten als aufklappbare Gruppen, automatisches Inhaltsverzeichnis, Nummerierung automatisch nach der Stelle im Text, Verweise „siehe 2.5 …“, die beim Verschieben mitwandern, Hinweis auf offene Platzhalter) und „Impressum“ als Formular mit den Pflichtangaben nach § 5 DDG (Abschnitte mit Gesetzesstelle, „Nicht anwendbar“ wählbar, dazu optional „Weitere Hinweise“ wie Haftung für Links und Urheberrecht). Das Impressum hat eine feste Kennung und wird nur über sein Formular gespeichert. Braucht einmal die Datenbank-Erweiterung sql/0.12.0_legal_documents.sql." },
      { type: "feature", text: "Die Seiten /datenschutz und /impressum auf der Website kommen aus dem Core: Text, Nummern, Inhaltsverzeichnis und Verweise werden automatisch angezeigt, sobald das Projekt aktualisiert ist. Das Aussehen gibt der Core einheitlich vor." },
      { type: "feature", text: "Datenschutzerklärung als gemeinsame Vorlage für alle Projekte: Im Admin Firma, Kontakt und die passenden Bausteine (Karten, Videos, Terminbuchung, Newsletter, Zufriedenheitsanalyse, KI-Agent) wählen und den Text daraus erzeugen. Bei einer neuen Vorlagenversion erscheint ein Hinweis mit den Änderungen. Vor dem Ersetzen wird der bisherige Text gesichert (die letzten 10 Sicherungen), und jede Sicherung lässt sich im Admin mit einem Klick wiederherstellen." },
      { type: "feature", text: "Das Pop-up lässt sich einmal im Layout der Website einbinden (SitePopupHost) und erscheint dann auf der Seite, auf der Besucher einsteigen, statt nur auf einer einzelnen Seite. Im Admin erscheint es nie." },
      { type: "feature", text: "Neue Pop-up-Einstellungen im Admin: Zeitraum (von/bis), Häufigkeit (einmal pro Besuch, bei jedem Öffnen, einmal pro Tag oder Woche), Verzögerung und Seiten (alle, nur Startseite oder bestimmte). Braucht einmal die Datenbank-Erweiterung sql/0.12.0_site_popup_options.sql." },
      { type: "security", text: "Rechtstexte sind öffentlich nur mit ihren Inhalten lesbar, Sicherungen früherer Texte und die Einstellungen der Datenschutz-Vorlage nur im Admin. Die E-Mail-Adresse der Person, die zuletzt gespeichert hat, wird nicht gespeichert (bei bestehenden Tabellen entfernt die Datenbank-Erweiterung die Spalte)." },
    ],
    releaseNotes: "Neu: src/legal (Rechtstexte, Impressum-Formular, Datenschutz-Vorlage) und Tabelle legal_documents; Pop-up-Einstellungen und SitePopupHost. Datenbank, je einmal pro Projekt und erneut ausführbar: sql/0.12.0_legal_documents.sql und sql/0.12.0_site_popup_options.sql (Pop-up-Spalten, setzt sql/0.9.0_site_popup.sql voraus). Die öffentlichen Seiten /datenschutz und /impressum kommen aus dem Core: im Projekt einmalig eine Route app/[legal]/page.tsx mit den Re-Exports LegalRoute, generateLegalMetadata und generateLegalStaticParams anlegen (siehe README „Rechtstexte bearbeiten“). Das Pop-up: <SitePopupHost /> einmal in jedes öffentliche Root-Layout einbinden und bisherige SitePopup-Einbindungen auf einzelnen Seiten entfernen, sonst erscheint es doppelt. Die Admin-Seiten erscheinen über coreAdminPages automatisch.",
  },
  {
    version: "0.11.1",
    date: "2026-11-04",
    changes: [
      { type: "fix", text: "Die Seite „Core-Version“ im Admin zeigt den richtigen Stand an." },
    ],
  },
  {
    version: "0.11.0",
    date: "2026-11-04",
    changes: [
      { type: "fix", text: "Anfrage-Mails: „Antworten“ geht jetzt an den Besucher, der das Formular abgeschickt hat, statt an die eigene Absender-Adresse." },
      { type: "fix", text: "Anfrage-Mails: Der gewählte Betreff steht jetzt auch in der Tabelle mit den Angaben." },
      { type: "fix", text: "Bilder aus Upload-Feldern landen im passenden Mediathek-Ordner statt oben unter „Alle Medien“. Fehlt der Ordner, wird er angelegt." },
      { type: "feature", text: "Bildfeld: Die Vorschau kann das ganze Bild zeigen, zum Beispiel für Logos." },
    ],
  },
  {
    version: "0.10.0",
    date: "2026-10-28",
    changes: [
      { type: "feature", text: "Mehrfachbearbeitung in den Listen: mehrere Einträge ankreuzen (mit Umschalt-Klick auch einen ganzen Bereich) und unten in der Leiste ein Feld für alle auf einmal ändern, z. B. Marke, Kategorie, Sichtbarkeit, Preis um Prozent oder zugeordnete Bereiche. Vor dem Speichern steht eine Zusammenfassung da." },
      { type: "feature", text: "Mehrere Einträge auf einmal löschen, mit Rückfrage. Das Projekt kann das Löschen sperren, wenn noch etwas daran hängt (z. B. Marken mit Produkten)." },
      { type: "security", text: "Gespeichert wird nur, was das Projekt freigegeben hat: Tabelle, Felder und Bereich (z. B. Abteilung) prüft der Server bei jeder Änderung, ebenso jeden Wert nach seiner Art." },
    ],
  },
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

/** Aktuelle Version: immer der oberste Eintrag, kann also nicht abweichen. */
export const CORE_VERSION = CORE_CHANGELOG[0].version;
