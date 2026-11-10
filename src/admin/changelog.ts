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
    version: "0.16.0",
    date: "2026-11-10",
    changes: [
      { type: "security", text: "Fremde können keine E-Mail-Zugangsdaten mehr mitlesen: Das gespeicherte Passwort für den E-Mail-Versand bleibt auf dem Server und wird im Admin nicht mehr angezeigt. Leer gelassen bleibt es beim Speichern erhalten." },
      { type: "security", text: "Besserer Schutz vor Spam auch für ältere Kontaktformulare: zu lange Eingaben, zu viele Links und zu viele Anfragen in kurzer Zeit werden abgewiesen." },
      { type: "security", text: "Links in E-Mails zum Zurücksetzen des Passworts führen immer auf die eigene Website." },
      { type: "security", text: "In den Einstellungen lassen sich nur noch die vorgesehenen Felder speichern." },
      { type: "feature", text: "E-Mail-Einstellungen zeigen klar, was noch fehlt. Die Test-E-Mail geht an dieselbe Adresse wie neue Anfragen: Klappt der Test, kommen auch die Anfragen an." },
      { type: "feature", text: "Posteingang lädt auch bei vielen Anfragen schnell: zuerst die neuesten 100, ältere per Knopf „Ältere laden“." },
      { type: "feature", text: "Unvollständig hochgeladene Anhänge werden automatisch entfernt und belegen keinen Speicher mehr." },
      { type: "fix", text: "Mediathek: öffnet schneller, lädt Vorschaubilder erst bei Bedarf und zeigt PDFs als Symbol. Die Suche reagiert ruhig beim Tippen und zeigt immer die richtigen Treffer." },
      { type: "fix", text: "Mediathek: Ein Ordner lässt sich nicht mehr versehentlich in sich selbst oder einen eigenen Unterordner verschieben. Das Verschieben-Fenster schließt sich danach wieder." },
      { type: "fix", text: "Mediathek: Beim Löschen eines Ordners werden auch seine Unterordner und Dateien gelöscht (vorher landeten die Dateien im Hauptverzeichnis). Die Rückfrage sagt vorher, was alles wegfällt." },
      { type: "fix", text: "Mediathek: Der Abgleich mit dem Speicher findet alle Dateien, auch bei sehr vielen Bildern in einem Ordner." },
      { type: "fix", text: "Die Speicheranzeige in der Mediathek ist jetzt ein kleiner Ring mit Prozentzahl, daneben „belegt von verfügbar“. Sie springt beim Öffnen nicht mehr und zeigt auch kleine Mengen richtig an." },
      { type: "fix", text: "Im Posteingang gleitet eine geöffnete Anfrage sanft herein und beim Schließen wieder hinaus. Eigene Bezeichnungen für Felder wie „Nachricht“ bleiben erhalten." },
      { type: "fix", text: "Admin-Seiten wie Datenschutzerklärung und Core-Version laden deutlich schneller." },
      { type: "fix", text: "Das Pop-up erscheint erst, wenn sein Bild geladen ist (kein leerer Kasten mehr)." },
      { type: "fix", text: "Einstellungen zeigen beim Öffnen sofort die gespeicherten Werte. Textfelder im Rechtstext-Editor springen beim Tippen nicht mehr." },
      { type: "fix", text: "Größenangaben einheitlich auf Deutsch, z. B. „1,5 MB“." },
      { type: "fix", text: "Rechtstexte sind im Daten-Export enthalten." },
      { type: "fix", text: "Rückmeldungen wie „Gespeichert“ oder Fehlerhinweise erscheinen jetzt in jedem Admin zuverlässig unten rechts." },
      { type: "fix", text: "Die Zahl neuer Anfragen im Menü stimmt sofort, sobald eine Anfrage geöffnet, erledigt oder gelöscht wird." },
    ],
    releaseNotes: "**Für Entwickler:** Einmal je Projekt `sql/0.16.0_haertung.sql` ausführen (vor oder nach dem Update): service_role-Recht auf legal_documents (Export), Trigger gegen Ordner-Kreise in media_folders, updated_at-Trigger, Funktion core_storage_usage() für die Speicheranzeige, Indizes für submissions(created_at) und consent_events(action), search_path für consent_guard, Bucket images: Dateiliste nur für Admins (Dateien bleiben öffentlich), Größen-/Typgrenze nur, wenn noch keine gesetzt ist. `sql/0.15.0_posteingang.sql` erst ausführen, wenn das Projekt mit v0.15.0 oder neuer live ist (entzieht Besuchern das direkte Eintragen); `0.14.0_basis.sql` entspricht jetzt dem Endstand. Empfohlen: NEXT_PUBLIC_SITE_URL in Vercel. Optional: Admin-Fehler- und Ladeseite per Re-Export (`core-cms/src/admin/AdminError`, `AdminLoading`). In Supabase prüfen: Registrierung und anonyme Anmeldung aus. **Änderungen im Code:** AdminShell lädt Menü aus `src/admin/core-nav.ts` und Version aus `src/admin/core-version.ts` (setzt `npm run release`), keine Server-Seiten und kein Changelog mehr im Browser-Bundle. Server-Module mit `import \"server-only\"`. `getSmtpSettings()` liefert kein Passwort mehr (`passStatus`, `missing`); Test-E-Mail und Benachrichtigung nutzen `email/smtp-settings.ts`. `saveGeneralSettings` nur Felder aus `GENERAL_SETTINGS_FIELDS`, `updateHeroImageSetting` lehnt Kern-Spalten ab. `submitContactForm` mit Längen-, Link- und Adresslimit. `useMediaLibrary({ enabled })`, `MoveModal({ excludeFolderIds })`, Typen in `media/folder-tree.ts`, `formatBytes` in `ui/format.ts`. Einwilligungen: zusätzlich `maxPerSender` (Standard 30 je 10 Minuten). Favicon-Sperre meldet `icons:` nur in Dateien mit Metadaten. Mediathek und Posteingang in kleinere Dateien aufgeteilt (`media/media-actions.ts`, `MediaToolbar`, `MediaSelectionBar`, `submissions/submission-view.ts`, `SubmissionsList`, `SubmissionDetail`); Verhalten, Props und Exporte unverändert. AdminShell bringt einen eigenen Toaster (`ui/AdminToaster.tsx`) mit, der nur erscheint, wenn die Seite noch keinen hat: Projekte ohne `<Toaster>` im Layout zeigen ihre Meldungen jetzt an, Projekte mit eigenem ändern sich nicht. Posteingang meldet Statuswechsel und Löschen per `core-cms:submissions-changed`, die Zahl im Menü zählt dann neu. Details: README, Abschnitt „Absicherung und Aufräumen (ab v0.16.0)“.",
  },
  {
    version: "0.15.0",
    date: "2026-11-09",
    changes: [
      { type: "feature", text: "Der Posteingang ist auf allen Websites gleich und steht im Menü ganz oben unter „System“, mit der Zahl neuer Anfragen. Anfragen aus allen Formularen der Website kommen hier an, auch mit eigenen Feldern, die mit ihrer Bezeichnung angezeigt werden." },
      { type: "feature", text: "Formulare können Dateien annehmen, z. B. Bewerbungsunterlagen (PDF, JPG oder PNG). Die Dateien liegen in einem geschützten Bereich, den nur angemeldete Verwalter sehen, und werden mit der Anfrage gelöscht. Vor dem Herunterladen erscheint ein Hinweis, dass Anhänge von Fremden stammen und nicht auf Viren geprüft sind." },
      { type: "feature", text: "Formulare müssen nicht mehr nach Name und E-Mail fragen. Welche Angaben Pflicht sind, wird je Formular festgelegt, z. B. eine Newsletter-Anmeldung nur mit E-Mail oder anonymes Feedback." },
      { type: "security", text: "Anfragen sind von außen weder lesbar noch direkt eintragbar. Jede Anfrage läuft über den Spam-Schutz der Website." },
      { type: "security", text: "Die Mediathek weist darauf hin, dass alle Dateien dort öffentlich abrufbar sind und keine vertraulichen Unterlagen hineingehören." },
    ],
    releaseNotes: "**Vor dem Update:** sql/0.15.0_posteingang.sql im Supabase-Projekt ausführen (name/email optional, field_labels, Besucher ohne Lese- und Schreibrecht auf submissions, Tabelle submission_files, privater Bucket anfragen). Danach speichert der Core Anfragen nur über SUPABASE_SERVICE_ROLE_KEY. **Posteingang als Core-Seite:** /admin/posteingang über coreAdminPages (Gruppe system, ganz oben), alte Adresse /admin/submissions leitet withCoreCms um. Eigene Seite admin/(dashboard)/submissions/, Menüpunkt /admin/submissions und die Zählung newSubmissions im selben Commit wie das Update löschen, sonst brechen next dev/next build ab. Links auf /admin/submissions auf /admin/posteingang ändern. **Formulare:** defineForm (core-cms/src/submissions), receiveSubmission (core-cms/src/submissions/server) in einer Server Action, im Formular <FormGuard /> und sendForm (core-cms/src/submissions/client). Eigener Spam-Schutz in den Projekten entfällt. submitContactForm bleibt, ohne Pflichtfelder. Siehe README, Abschnitt „Posteingang und Formulare“. Typen: Submission.name und Submission.email sind jetzt string | null.",
  },
  {
    version: "0.14.0",
    date: "2026-11-09",
    changes: [
      { type: "feature", text: "Cookie-Einwilligung: Eingebettete Inhalte wie Karten, Videos oder Terminbuchung laden erst, wenn Besucher zustimmen, direkt am Inhalt oder über einen Cookie-Banner. Ablehnen ist genauso einfach wie Zustimmen, und die Auswahl lässt sich jederzeit über „Cookie-Einstellungen“ ändern. Auf Datenschutzerklärung und Impressum erscheint der Banner nie." },
      { type: "feature", text: "Neue Seite „Einwilligungen“ (sofern auf deiner Website eingerichtet): zeigt, wie viele Besucher zustimmen, und hält jede Entscheidung als Nachweis fest, ohne IP-Adresse und ohne Namen. Das Protokoll lässt sich als Tabelle herunterladen, alte Einträge lassen sich löschen." },
      { type: "security", text: "Jede Website mit Cookie-Einwilligung wird vor dem Einsatz automatisch geprüft: Vor der Zustimmung geht nichts an andere Anbieter." },
      { type: "feature", text: "Die Mediathek zeigt, wie viel Speicherplatz deine Website belegt und wie viel dein Tarif enthält. Ab 80 % erscheint ein Hinweis. Hochladen bleibt immer möglich." },
      { type: "feature", text: "Die „Einstellungen“ sind auf allen Websites gleich aufgebaut: Website & Branding, E-Mail & SMTP und Daten-Export, im Menü unter „System“. Inhalte, die nur deine Website hat (z. B. Kopfbilder), findest du unter „Inhalte“." },
      { type: "feature", text: "Datenschutzerklärung: Die Abschnitte zu Cookies und zum Kontaktformular lassen sich abschalten, wenn deine Website keine Cookie-Einwilligung oder kein Kontaktformular hat. Hinweise darauf an anderen Stellen fallen dann mit weg. Der Text ändert sich erst, wenn du „Text aus Vorlage holen“ wählst und übernimmst." },
      { type: "feature", text: "Logo und Favicon kommen auf der ganzen Website aus den Einstellungen (Website & Branding). Ein neues Bild dort erscheint sofort überall: im Browser-Tab, in der Kopf- und Fußzeile, auf der Login-Seite und in der Verwaltung." },
      { type: "fix", text: "Datenschutzerklärung: Ohne Telefonnummer erscheint keine leere Telefonzeile mehr. Zwei überflüssige Felder sind entfallen. Der Cookie-Abschnitt ist allgemein gehalten, welche Cookies ein Dienst nutzt, steht beim jeweiligen Dienst." },
    ],
    releaseNotes: "**Für Entwickler (vorher in den Einträgen):** Neue Projekte: sql/0.14.0_basis.sql legt site_settings, email_settings, Mediathek (media_folders, media_files, Bucket images) und Posteingang (submissions) an, danach die übrigen Dateien in sql/ der Versionsreihe nach; bestehende Projekte brauchen es nicht. Einwilligungsprotokoll braucht einmal sql/0.14.0_consent.sql. Browser-Prüfung je Projekt: npm run consent:check. Speicher-Kontingent kommt aus der WNT-IT-Verwaltung, STORAGE_QUOTA_GB nur für Sonderfälle. Ein Projekt darf keine eigene Route oder keinen Menüpunkt für Core-Seiten anlegen (außer Datenschutzerklärung und Impressum): next dev/next build brechen sonst ab. Konzept und Referenz zum Cookie-Banner: docs/COOKIE_BANNER_KONZEPT.md und docs/REFERENZ_LFDI_BW_COOKIES_TRACKING.md. **Einstellungen als Core-Seite:** Projekte mit eigener Einstellungsseite prüfen zuerst, dass nichts verloren geht (SMTP-Daten in email_settings, bei Projekten vor v0.10.0 eventuell noch in smtp_*-Spalten von site_settings; Standard-Seitenname in die Optionen, projektspezifische Bereiche wie Kopfbilder als eigene Seite unter „Inhalte“), und löschen dann im selben Commit wie das Update, sonst startet das Projekt nicht: admin/(dashboard)/einstellungen/ (page.tsx, actions.ts, ggf. AdminSettingsClient.tsx), src/components/admin/GeneralSettingsForm.tsx und SmtpSettingsForm.tsx (Wrapper) sowie den Menüpunkt /admin/einstellungen in system. Projekteigene Formulare, die aus einstellungen/actions.ts importieren (z. B. ein Formular für Kopfbilder), ziehen mit ihrer neuen Seite unter „Inhalte“ um und bekommen dort eine eigene \"use server\"-Datei. Optional: Standard-Seitenname und Daten-Export ausblenden über CoreAdminRoute options (README, Abschnitt „Einstellungen“). Keine SQL-Migration (Tabellen site_settings und email_settings wie bisher). Neu: src/consent (ConsentProvider, ConsentGate, ConsentSettingsLink, defineConsentConfig, dienst; Server-Teil in core-cms/src/consent/server), Admin-Seite einwilligungen (optional), AdminShell-Prop optionalPages. **Opt-in:** Projekte, die das Feature nicht einbinden, bemerken nichts. **Einrichtung:** sql/0.14.0_consent.sql ausführen, consent.config.ts anlegen, Route app/api/consent/route.ts, <ConsentProvider> im Layout, Einbettungen mit <ConsentGate> umschließen, AdminShell optionalPages={[\"einwilligungen\"]}. Siehe README, Abschnitt „Einwilligungen“. Die Datenschutz-Vorlage (2026-11-06) beschreibt das neue Verfahren und erst nach dem Umbau des Projekts übernehmen. **Logo und Favicon aus den Einstellungen (Pflicht):** Root-Layout nutzt `export const generateMetadata = withSiteBranding({ … })` aus core-cms/src/branding statt eigener icons-Metadaten, Logos über <SiteLogo /> (Server Component, in Client-Komponenten als Prop hineinreichen). next dev/next build brechen ab bei app/favicon.ico, app/icon.*, app/apple-icon.*, public/favicon.* und icons-Metadaten in Layouts/Seiten. Vor dem Update Logo und Favicon in der Mediathek hochladen und in den Einstellungen auswählen, dann die Dateien und icons-Einträge im selben Commit entfernen. Neue Entwicklungsabhängigkeiten: vitest, jsdom, @testing-library, playwright (nur im Core, nicht in den Projekten).",
  },
  {
    version: "0.13.0",
    date: "2026-11-05",
    changes: [
      { type: "feature", text: "Neuer Bereich „Daten-Export“ in den Einstellungen: lädt alle Inhalte und Medien der Website als eine ZIP-Datei herunter. Alle Tabellen der Datenbank werden automatisch erkannt, auch die, die ein Projekt selbst angelegt hat, ebenso alle Speicherbereiche mit ihren Dateien. Im Projekt muss nichts eingetragen werden. Einzelne Tabellen lassen sich zusätzlich als JSON laden, die Medien lassen sich abwählen." },
      { type: "security", text: "Die Zugangsdaten für den E-Mail-Versand (und alle Tabellen mit Namen wie secret, token, password, smtp) sind nie im Export enthalten." },
      { type: "feature", text: "Datenschutz-Vorlage auf die Grundtexte reduziert: Allgemeine Informationen, Hosting, E-Mail-Versand, Cookies, Kontaktformular und Rechte. Diese Abschnitte sind im Editor gesperrt. „Text aus Vorlage holen“ zeigt zuerst wortweise, was sich an ihnen ändert, und ersetzt nur sie, alle anderen Abschnitte bleiben erhalten. Karten, Videos, Terminbuchung, Newsletter und Ähnliches werden als eigener Abschnitt eingetragen." },
      { type: "feature", text: "Neue Fassungen der Datenschutz-Vorlage kommen ohne Update der Website: Der Admin lädt den aktuellen Vorlagentext von WNT-IT und zeigt „Neue Vorlage verfügbar“. Übernommen wird er erst nach Prüfung mit „Text aus Vorlage holen“." },
      { type: "feature", text: "Die Aufsichtsbehörde ergibt sich aus dem Bundesland (Auswahl)." },
      { type: "fix", text: "Pop-up, Datenschutzerklärung und Impressum stehen im Menü jetzt unter „System“." },
      { type: "feature", text: "Aufgeräumtes Menü: Mein Konto öffnet sich mit einem Klick auf den Benutzer unten links. Die Core-Version steht immer sichtbar darüber, ein Klick öffnet den Changelog, eine Zahl zeigt verfügbare Updates." },
    ],
    releaseNotes: "Neu: src/export (ExportPanel, Server Actions, automatische Tabellen- und Bucket-Erkennung), neue Abhängigkeit fflate. Braucht SUPABASE_SERVICE_ROLE_KEY im Projekt (ist bei den Projekten mit SMTP-Einstellungen schon gesetzt). **Migration:** Die Backup-Seite im Projekt (src/app/**/admin/**/backup/page.tsx) und ihren Menüeintrag löschen und in der Einstellungen-Seite des Projekts einen Tab mit <ExportPanel /> aus core-cms/src/export ergänzen. Ohne diesen Tab ist der Export nicht erreichbar.\n\n## Breaking\n\nDatenschutz-Vorlage: DatenschutzConfig.module, DATENSCHUTZ_MODULE_LABELS und die zuschaltbaren Bausteine entfallen. **Migration:** `module` aus der Konfiguration im Projekt entfernen. Beim ersten „Text aus Vorlage holen“ werden die Vorlagen-Abschnitte samt eigener Änderungen darin ersetzt (der alte Text wird gesichert); Inhalte, die bleiben sollen, vorher in eigene Abschnitte verschieben. Menü: Einträge für Datenschutzerklärung und Impressum aus der Projekt-Navigation entfernen, sie kommen aus coreAdminPages. Projekte ohne AdminShell (eigene Navigation aus coreAdminPages) behalten Konto und Core-Version als Menüpunkte, also dort nicht nach inMenu filtern.\n\n## Sicherheit\n\nDer Daten-Export liest mit dem Service-Role-Schlüssel alle Tabellen und Speicherbereiche, und jedes Konto ist Admin. **Vor dem Update je Supabase-Projekt prüfen, dass die öffentliche Registrierung aus ist** (Authentication, „Allow new users to sign up“). Projekte mit Content-Security-Policy brauchen https://api.github.com in connect-src, sonst fehlt nur die Update-Zahl im Menü.",
  },
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
      { type: "feature", text: "„Mein Konto“: Du kannst deine E-Mail-Adresse und dein Passwort selbst ändern." },
    ],
  },
];

// Die installierte Version steht in core-version.ts (setzt der Release-Befehl). Diese Datei bleibt ohne Imports,
// weil scripts/release.mjs sie direkt mit Node einliest.
