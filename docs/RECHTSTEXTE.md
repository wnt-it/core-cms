# Rechtstexte zentral verwalten (Datenschutzerklärung, Impressum)

Die Vorlagen für alle core-cms-Kunden liegen **hier im Core**, nicht in den Projekten. Ein Text, eine Stelle zum Ändern.
Den Text der Datenschutz-Vorlage lesen die Projekte direkt aus diesem Repo (Branch `live`), alles andere kommt mit dem nächsten Versionsupdate.

## Was liegt wo

| Was | Wo | Hinweis |
| :--- | :--- | :--- |
| Text der Datenschutzerklärung (Bausteine) | `src/legal/templates/datenschutz-vorlage.json`, Feld `blocks` | **Einzige Quelle.** Projekte ab v0.13.0 lesen die Datei vom Branch `live`, eine Textänderung braucht kein Release. |
| Version und Änderungsliste der Vorlage | dieselbe Datei: `version`, `changes` | Bei jeder inhaltlichen Änderung erhöhen und beschreiben. |
| Wie der Text gebaut wird (Platzhalter, Anschrift, Aufsichtsbehörde) | `src/legal/templates/datenschutz.ts` | Änderungen hier brauchen ein Release. |
| Impressum (Pflichtangaben nach § 5 DDG als Formular) | `src/legal/impressum.ts` | Felder und Gesetzesstellen sind für alle gleich, das Projekt gibt nur die Angaben ein. |
| Editor, Einstellungen der Vorlage im Admin | `src/legal/LegalDocumentForm.tsx`, `src/legal/templates/TemplatePanel.tsx` | Erscheint automatisch unter „Datenschutzerklärung“ bzw. „Impressum“. |
| Einstellungen je Projekt | Datenbank, Tabelle `legal_documents`, Zeile `datenschutz-einstellungen` | Firma, Kontakt, zugeschaltete Bausteine, Stand der Vorlage. |
| Text je Projekt | Datenbank, Tabelle `legal_documents`, Zeile `datenschutz` (Sicherungen früherer Texte: `datenschutz-sicherung-<Datum>-<Uhrzeit>`, die letzten 10, im Admin wiederherstellbar) | Nach dem ersten Speichern gilt dieser Text, nicht mehr die Vorlage im Code. |
| Offene Fragen und Prüfpunkte je Kunde | im jeweiligen Projekt, z. B. `docs/DATENSCHUTZ_OFFENE_FRAGEN.md` | Kundenspezifisch, gehört nicht in den Core. |

## Aufbau der Datenschutz-Vorlage

Der Text besteht aus **Bausteinen**:

- **Bausteine der Vorlage** (alle fest, `fest: true`, im Editor für alle gesperrt, Änderung nur hier im Core): Allgemeine Informationen (1.x), Hosting, Betrieb und Sicherheit, Versand von E-Mails, Cookies und Einwilligungsmanagement, Kontaktformular, Rechte (3.x) mit Änderungsklausel. Sie dürfen keine `[● …]` enthalten, weil niemand sie im Editor füllen könnte: Alles Veränderliche kommt aus den Einstellungen.
- **Alles andere ist nicht in der Vorlage:** Karten, Videos, Terminbuchung, Newsletter, Reichweitenmessung, KI-Agent, andere Formulare usw. trägt der Kunde bzw. WNT-IT im Admin als eigenen Abschnitt ein. Entwürfe: [DATENSCHUTZ_BAUSTEINE_SPAETER.md](DATENSCHUTZ_BAUSTEINE_SPAETER.md).
- **Projektangaben** (Firma, Anschrift, Kontakt, Bundesland, Name des Cookie-Eintrags) ersetzen die `%Platzhalter%` im Text. Das Bundesland bestimmt die Aufsichtsbehörde (`src/legal/templates/aufsichtsbehoerden.ts`).
- **Kontaktformular:** Der Abschnitt gilt nur für das Standard-Kontaktformular und sagt das ausdrücklich. Ein anderes Formular bekommt einen eigenen Abschnitt. Anfragen bleiben im Backend, bis sie bearbeitet wurden, und werden nach einer kurzen Vorhaltezeit gelöscht. Das Löschen passiert im Posteingang von Hand, der Kunde muss das also tun.
- **Nicht genannt:** Standort der Datenbank und Name des E-Mail-Dienstes.
- Offene Punkte stehen als `[● …]` im Text und werden im Editor gelb markiert (Zähler mit Hinweis).
- Überschriften werden automatisch nummeriert, Verweise („siehe 2.5 …“) laufen über Kennungen (`ref`) und wandern mit.

## So ändern Sie die Vorlage (Ablauf)

**Nur Text ändern (der Normalfall, kein Release):**

1. Text in `src/legal/templates/datenschutz-vorlage.json` ändern (Regelwerk beachten, s. u.). Eine Zeile ist ein Block (`t`: h1/h2/h3/p/li, `text`, optional `ref`).
2. `version` erhöhen (heutiges Datum, bei mehreren Änderungen am Tag `.2`, `.3` …) und oben in `changes` einen Eintrag ergänzen (einfache Sprache, was ist neu und warum).
3. Erlaubt sind nur die `%Platzhalter%` aus `VORLAGE_PLATZHALTER` (datenschutz.ts), die Marker `@@ADRESSE@@` und `@@ANSPRECHPARTNER@@` je genau einmal und Verweise auf vorhandene `ref`. Eine Datei, die das verletzt, wird von allen Projekten abgelehnt (dann gilt die mitgelieferte Fassung). Vor dem Merge prüfen: `npx tsc --noEmit` und im Admin eines Projekts die Vorschau ansehen.
4. Pull Request nach `live` und mergen. Spätestens nach etwa 5 Minuten zeigen alle Projekte ab v0.13.0 bei „Datenschutzerklärung“ **„Neue Vorlage verfügbar“** mit der Änderungsliste.

**Neue Platzhalter, neue Felder oder andere Logik:** wie bisher Code ändern und Release (Skill `cms-release`), danach die Projekte heben.

Der Text wird nie automatisch übernommen. Pro Projekt:

5. Im Admin **„Text aus Vorlage holen“**: Eine Vorschau zeigt wortweise, was sich an den Abschnitten der Vorlage ändert. „Übernehmen und speichern“ ersetzt sie (der bisherige Text wird vorher gesichert).
6. Die Tabelle unten aktualisieren.

## So funktioniert das Holen der Vorlage (`src/legal/templates/merge.ts`)

Der Text wird in Abschnitte geteilt (Überschrift bis zur nächsten Überschrift). Abschnitte, deren Überschrift zur Vorlage gehört, werden samt Inhalt ersetzt, auch die Einleitung. Alle anderen bleiben unverändert hinter dem Abschnitt, hinter dem sie stehen. Die Überschriften werden danach neu nummeriert. Die Vorschau vergleicht je Abschnitt den Text im Admin mit der neuen Vorlage. Ein Abgleich einzelner Absätze ist geplant, siehe [BACKLOG.md](../BACKLOG.md).

## Regelwerk (Kurzfassung, Stand 04.11.2026)

- Aufbau: 1 Allgemeine Informationen, 2 Verarbeitungszwecke, 3 Ihre Rechte, 4 Änderung.
- Reihenfolge in jedem Zweck-Block: Beschreibung, Daten, Rechtsgrundlage (bei lit. f immer mit konkretem Interesse), Widerruf, Empfänger und Rolle, Drittland, Speicherdauer. Keine Feldüberschriften.
- Zitierweise „Art. 6 Abs. 1 lit. f) DSGVO“, Schreibweise „Webseiten“.
- Dienstleister mit der EU-Vertragsgesellschaft und Anschrift nennen, die US-Muttergesellschaft nur im Drittland-Satz.
- Nichts erfinden: Unklares als Platzhalter `[● …]`, offene Fragen in eine eigene Datei, nie in den Text.
- Unser Unternehmen (WNT-IT) wird nicht namentlich genannt, nur als „Auftragsverarbeiter“.
- Hosting bei allen gleich: Vercel (Funktionen und Edge Network, Region Frankfurt `fra1`), Supabase (Datenbank, Region je Projekt), IP-Adressen in Logfiles 24 Stunden, Drittländer USA und Singapur, Standardvertragsklauseln und DPF.

## Übersicht: welches Projekt steht wo (bitte nach jedem Rollout pflegen)

Stand: 05.11.2026. Aktuelle Vorlagenversion: **2026-11-05.3**.

| Projekt | core-cms | Datenschutz im Admin (Vorlage) | Stand der Vorlage im Projekt | Impressum-Formular | Bemerkung |
| :--- | :--- | :--- | :--- | :--- | :--- |
| alb-naturenergie | v0.12.0 (lokal, Abgleich noch nicht released) | ja, nach Release | Text in der Datenbank beruht auf der Fassung vom 04.11.2026 mit eigenen Änderungen, noch nicht mit der Vorlage abgeglichen. Das Mietverwaltungsformular braucht vor dem ersten Holen einen eigenen Abschnitt | ja, nach Release | Vercel-Region `fra1` per `vercel.json` und Projekteinstellung (nach Deployment prüfen) |
| richardprinz | v0.10.0 | noch nicht (eigener Text im Projekt) | – | noch nicht | Supabase-Region Frankfurt. Vor dem Einsatz der Vorlage Vercel-Region `fra1` setzen und prüfen (die Vorlage sagt „Frankfurt“) |
| veee | v0.8.0 | noch nicht (eigener Text im Projekt) | – | noch nicht | Supabase-Region Irland. Vor dem Einsatz der Vorlage Vercel-Region `fra1` setzen und prüfen (die Vorlage sagt „Frankfurt“) |

## Checkliste neues Kundenprojekt mit Admin

- `vercel.json` mit `{ "regions": ["fra1"] }` und im Vercel-Projekt Function Region Frankfurt setzen. Nach dem Deployment den Header `x-vercel-id` prüfen (`fra1::fra1`).
- Supabase-Projekt in der EU anlegen (Region ist später nicht änderbar).
- Datenbank-Migrationen aus `sql/` ausführen (inkl. `0.12.0_legal_documents.sql`).
- Im Admin: Datenschutzerklärung (Vorlage einrichten, Text erzeugen, Platzhalter füllen) und Impressum ausfüllen.
- Auftragsverarbeitungsvertrag mit dem Kunden abschließen, bevor die Datenschutzerklärung live geht.
