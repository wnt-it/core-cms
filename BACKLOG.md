# Plan für die nächsten core-cms-Updates

Die zentrale Liste aller Fixes und Features für den Core. Was beim Arbeiten in den Kundenprojekten auffällt, kommt hierher,
statt einzeln ausgespielt zu werden. Wir arbeiten die Liste gemeinsam ab, taggen dann eine neue Version, heben die Projekte
(Skill `cms-release`) und entfernen die erledigten Punkte. Was erledigt wurde, steht danach im `CHANGELOG.md` des Workspaces.

Format: `- [ ] **Bereich: kurzer Titel** (gefunden in Projekt, Datum)`, darunter Problem und gewünschte Lösung.

## Beim Update der Projekte auf v0.14.0 umstellen

- [ ] **Logo und Favicon aus den Einstellungen** (eingeführt in wnt-it, 09.11.2026)
  Ab v0.14.0 starten Projekte mit eigenem Favicon nicht mehr (`next dev`/`next build` brechen ab, Prüfung in `next-config.mjs`). Daher im selben Commit wie das Update: zuerst Logo und Favicon in der Mediathek des Projekts hochladen und unter Einstellungen → Website & Branding auswählen, dann die Fundstellen entfernen. Im Root-Layout `export const generateMetadata = withSiteBranding({ … })` und für jedes Logo der Website `<SiteLogo />` aus `core-cms/src/branding` (README, Abschnitt „Logo und Favicon“). Vorbild: wnt-it (`src/app/layout.tsx`, `SiteChrome`, `Navbar`, `Footer`, Admin-Layout). Fundstellen je Kundenprojekt: `OFFENE_PUNKTE.md` im Workspace (nicht im öffentlichen Repo).

## Fixes

- [ ] **Medien: automatische Sicherung des Speichers fehlt** (Tarif-Abgleich, 07.11.2026)
  Die Leistungsbeschreibung verspricht für die größeren Tarife eine regelmäßige Sicherung des Medienspeichers (AGB § 5 Abs. 6 c). Die Supabase-Sicherungen umfassen nur die Datenbank, nicht die Dateien in den Storage-Buckets. Im Core gibt es dafür nur den Daten-Export als ZIP, den jemand von Hand anstößt. Gewünscht: regelmäßige automatische Sicherung aller Buckets an einen zweiten Ort (z. B. per Cron-Job auf Vercel in einen getrennten Speicher), mit Aufbewahrungsdauer und Anzeige „letzte Sicherung“ im Admin. Bis dahin entweder manuell sichern oder die Formulierung auf der Website anpassen.

## Features

- [ ] **Posteingang als Core-Seite, Formulare ohne Pflichtfelder, Anhänge** (Planung, 09.11.2026) → v0.15.0
  - *Core-Seite:* „Posteingang“ in `coreAdminPages` wie „Einstellungen“ (nur aus dem Core, Sperre über `CORE_ONLY_ADMIN_SLUGS`). Die alten Projektseiten `/admin/submissions` fallen weg, die alte Adresse leitet weiter (Links aus E-Mails). Ein Projekt hat eine eigene Fassung, vor dem Löschen vergleichen.
  - *Keine Pflichtfelder aus dem Core:* `name` und `email` in `submissions` optional (SQL), keine Pflichtprüfung in `submitContactForm`. Was Pflicht ist, legt das Formular im Projekt fest. Ausgefüllte Felder werden weiter geprüft (z. B. E-Mail-Format). Beliebige Zusatzfelder über `metadata`, mit lesbaren Bezeichnungen fürs Anzeigen.
  - *Spam-Schutz zentral:* verstecktes Feld, Mindestzeit, Längen, Begrenzung je Adresse aus den Projekten in den Core.
  - *Niemand liest Anfragen öffentlich:* Besucher dürfen heute nur einfügen, nicht lesen (`sql/0.14.0_basis.sql`). Zusätzlich: Einfügen nur noch über den Server (Service-Role), `insert` für `anon` entziehen, damit niemand am Spam-Schutz vorbei direkt in die Tabelle schreibt. Stand in jedem Projekt prüfen.
  - *Anhänge (nur wenn ein Formular sie einschaltet):* privater Bucket `anfragen` (kein öffentlicher Link, nur angemeldete Admins), Tabelle `submission_files` (Anfrage, Name, Größe, Typ, Pfad, Datum). Upload erst nach Prüfung über eine einmalige Upload-Adresse direkt zu Supabase (Vercel nimmt nur ca. 4,5 MB pro Anfrage). Standard nur PDF, JPG, PNG, echter Dateityp wird am Inhalt geprüft, Größe und Anzahl je Formular einstellbar. Download nur über kurz gültige Links und immer als Download, nie im Browser angezeigt. Löschen der Anfrage löscht die Dateien, optional Löschfrist. Kein Virenscanner: Hinweis beim Herunterladen, dass Anhänge von Fremden stammen und vor dem Öffnen vom Virenschutz des eigenen Rechners geprüft werden sollten.
  - *Mediathek:* Hinweis „Alle Dateien hier sind öffentlich abrufbar. Keine vertraulichen Unterlagen hochladen.“

- [ ] **Admin: Core-Seiten im Menü ausblenden** (wnt-it, 08.11.2026)
  Nicht jedes Projekt nutzt jede Core-Seite, z. B. bindet wnt-it das Pop-up nicht ein, der Menüpunkt „Pop-up“ erscheint trotzdem. Gewünscht: AdminShell-Prop `hiddenPages` (Gegenstück zu `optionalPages`), z. B. `hiddenPages={["popup"]}`.
- [ ] **Datenschutz-Vorlage für rein statische Websites** (Tarif-Abgleich, 07.11.2026)
  Websites ohne Datenbank und ohne Admin nutzen keinen Core-Code, sollen aber denselben gepflegten Text-Stand haben. Zweite Datei neben `src/legal/templates/datenschutz-vorlage.json` mit denselben festen Abschnitten, aber ohne die Absätze zu Datenbank, Dateispeicher, Supabase, Kontaktformular-Speicherung und Pop-up. Gleiches Änderungsprotokoll wie die bestehende Vorlage (`docs/RECHTSTEXTE.md`). Statische Projekte übernehmen den Text beim Setup und bei neuen Fassungen.
- [ ] **Cookie-Banner im Core mit Einwilligungsprotokoll** (Kundenprojekt, 06.11.2026)
  Banner, Einstellungs-Dialog, Dienst-Katalog und Protokoll (Supabase des Projekts) als Core-Feature, rechtliche Vorgaben fest im Core, Projekt trägt nur Dienste und Farben ein. Konzept, Phasen und offene Entscheidungen: `docs/COOKIE_BANNER_KONZEPT.md`; Maßstab ist die FAQ des LfDI Baden-Württemberg, zusammengefasst in `docs/REFERENZ_LFDI_BW_COOKIES_TRACKING.md`. Phase 1 = v0.14.0, danach Umbau des ersten Kundenprojekts. Später (Phase 3), nur zu prüfen: einwilligungsfreie Bausteine (Karte über eigenen OSM-Proxy, cookielose Seitenaufruf-Zählung ohne IP und Kennung), Bedingungen in Konzept Abschnitt 11.
- [ ] **Datenschutz-Vorlage: zuschaltbare Bausteine** (Kundenprojekt, 05.11.2026)
  Karten, Videos, Terminbuchung, Newsletter und Zufriedenheitsanalyse wieder als Schalter in die Vorlage holen, allgemein formuliert mit Platzhaltern für den Anbieter. Später fertige Texte je Anbieter (YouTube, Vimeo, Bookings, Calendly). Entwürfe: `docs/DATENSCHUTZ_BAUSTEINE_SPAETER.md`. Bis dahin trägt der Kunde sie im Admin als eigenen Abschnitt ein.
- [ ] **Datenschutz-Vorlage: Abgleich einzelner Absätze** (Kundenprojekt, 05.11.2026)
  Für anpassbare Bausteine: Dreiwege-Abgleich (Stand beim letzten Holen, Text im Admin, neue Vorlage). Unveränderte Absätze aktualisieren, vom Kunden geänderte behalten, bei Änderung auf beiden Seiten wortweise zeigen, was sich geändert hat, und fragen. Erst nötig, wenn es die zuschaltbaren Bausteine gibt. Heute werden nur die festen Abschnitte ersetzt.
