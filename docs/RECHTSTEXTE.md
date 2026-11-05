# Rechtstexte zentral verwalten (Datenschutzerklärung, Impressum)

Die Vorlagen für alle core-cms-Kunden liegen **hier im Core**, nicht in den Projekten. Ein Text, eine Stelle zum Ändern,
alle Projekte bekommen ihn mit dem nächsten Versionsupdate.

## Was liegt wo

| Was | Wo | Hinweis |
| :--- | :--- | :--- |
| Text der Datenschutzerklärung (Bausteine) | `src/legal/templates/datenschutz.ts` | **Einzige Quelle.** Nur hier ändern. |
| Version und Änderungsliste der Vorlage | dieselbe Datei: `DATENSCHUTZ_TEMPLATE_VERSION`, `DATENSCHUTZ_TEMPLATE_CHANGES` | Bei jeder inhaltlichen Änderung erhöhen und beschreiben. |
| Impressum (Pflichtangaben nach § 5 DDG als Formular) | `src/legal/impressum.ts` | Felder und Gesetzesstellen sind für alle gleich, das Projekt gibt nur die Angaben ein. |
| Editor, Einstellungen der Vorlage im Admin | `src/legal/LegalDocumentForm.tsx`, `src/legal/templates/TemplatePanel.tsx` | Erscheint automatisch unter „Datenschutzerklärung“ bzw. „Impressum“. |
| Einstellungen je Projekt | Datenbank, Tabelle `legal_documents`, Zeile `datenschutz-vorlage` | Firma, Kontakt, zugeschaltete Bausteine, Stand der Vorlage. |
| Text je Projekt | Datenbank, Tabelle `legal_documents`, Zeile `datenschutz` (Sicherung: `datenschutz-sicherung`) | Nach dem ersten Speichern gilt dieser Text, nicht mehr die Vorlage im Code. |
| Offene Fragen und Prüfpunkte je Kunde | im jeweiligen Projekt, z. B. `docs/DATENSCHUTZ_OFFENE_FRAGEN.md` | Kundenspezifisch, gehört nicht in den Core. |

## Aufbau der Datenschutz-Vorlage

Der Text besteht aus **Bausteinen**:

- **Immer enthalten:** Allgemeine Informationen (1.x), Hosting, Betrieb und Sicherheit (gleich für alle, da wir Vercel und Supabase betreiben), E-Mail-Versand, Cookies, Kontaktformulare, Rechte (3.x), Änderungsklausel.
- **Pro Projekt zuschaltbar** (im Admin per Schalter, `DatenschutzConfig.module`): Karten (Google Maps), Videos (YouTube), Online-Terminbuchung (Microsoft Bookings), Newsletter (CleverReach), Meinungs- und Zufriedenheitsanalyse, KI-Agent / WhatsApp-Chatbot.
- **Projektangaben** (Firma, Anschrift, Kontakt, Aufsichtsbehörde, Datenbank-Standort, E-Mail-Dienst, Name des Cookie-Eintrags, weitere Formulare) ersetzen die `%Platzhalter%` im Text.
- Offene Punkte stehen als `[● …]` im Text und werden im Editor gelb markiert (Zähler mit Hinweis).
- Überschriften werden automatisch nummeriert, Verweise („siehe 2.5 …“) laufen über Kennungen (`ref`) und wandern mit.

Neuen Baustein anlegen: in `datenschutz.ts` als Block-Liste ergänzen, in `DatenschutzConfig.module` und `DATENSCHUTZ_MODULE_LABELS` eintragen, in `buildDatenschutz` einhängen. Verweise auf zuschaltbare Bausteine nur bedingt setzen (sonst fehlt das Ziel).

## So ändern Sie die Vorlage (Ablauf)

1. Text in `src/legal/templates/datenschutz.ts` ändern (Regelwerk beachten, s. u.).
2. `DATENSCHUTZ_TEMPLATE_VERSION` auf das heutige Datum setzen und einen Eintrag in `DATENSCHUTZ_TEMPLATE_CHANGES` ergänzen (einfache Sprache, was ist neu und warum).
3. `npx tsc --noEmit`, dann Release (Skill `cms-release`).
4. Projekte auf die neue Core-Version heben. Im Admin steht dort bei „Datenschutzerklärung“ der Hinweis **„Neue Vorlage verfügbar“** mit der Liste der Änderungen.
5. Pro Projekt entscheidet der Kunde bzw. Sie: **„Text aus Vorlage erzeugen“** übernimmt die neue Vorlage vollständig (der bisherige Text wird vorher gesichert; eigene Änderungen im Text gehen dabei verloren), oder die Änderung wird von Hand im Editor nachgezogen.
6. Die Tabelle unten aktualisieren.

Grenzen (bewusst, 80/20): Es gibt keinen automatischen Abgleich einzelner Abschnitte. Hat ein Kunde den Text im Editor geändert, übernimmt das Erzeugen alles oder nichts.

## Regelwerk (Kurzfassung, Stand 04.11.2026)

- Aufbau: 1 Allgemeine Informationen, 2 Verarbeitungszwecke, 3 Ihre Rechte, 4 Änderung.
- Reihenfolge in jedem Zweck-Block: Beschreibung, Daten, Rechtsgrundlage (bei lit. f immer mit konkretem Interesse), Widerruf, Empfänger und Rolle, Drittland, Speicherdauer. Keine Feldüberschriften.
- Zitierweise „Art. 6 Abs. 1 lit. f) DSGVO“, Schreibweise „Webseiten“.
- Dienstleister mit der EU-Vertragsgesellschaft und Anschrift nennen, die US-Muttergesellschaft nur im Drittland-Satz.
- Nichts erfinden: Unklares als Platzhalter `[● …]`, offene Fragen in eine eigene Datei, nie in den Text.
- Unser Unternehmen (WNT-IT) wird nicht namentlich genannt, nur als „Auftragsverarbeiter“.
- Hosting bei allen gleich: Vercel (Funktionen und Edge Network, Region Frankfurt `fra1`), Supabase (Datenbank, Region je Projekt), IP-Adressen in Logfiles 24 Stunden, Drittländer USA und Singapur, Standardvertragsklauseln und DPF.

## Übersicht: welches Projekt steht wo (bitte nach jedem Rollout pflegen)

Stand: 05.11.2026. Aktuelle Vorlagenversion: **2026-11-05**.

| Projekt | core-cms | Datenschutz im Admin (Vorlage) | Stand der Vorlage im Projekt | Impressum-Formular | Bemerkung |
| :--- | :--- | :--- | :--- | :--- | :--- |
| alb-naturenergie | v0.11.1 (lokal mit v0.12.0-Stand getestet, noch nicht released) | ja, nach Release | Text in der Datenbank beruht auf der Fassung vom 04.11.2026 mit eigenen Änderungen, noch nicht mit der Vorlage verknüpft | ja, nach Release | Vercel-Region `fra1` per `vercel.json` und Projekteinstellung (nach Deployment prüfen) |
| richardprinz | v0.10.0 | noch nicht (eigener Text im Projekt) | – | noch nicht | Supabase-Region Frankfurt. Vor dem Einsatz der Vorlage Vercel-Region `fra1` setzen und prüfen (die Vorlage sagt „Frankfurt“) |
| veee | v0.8.0 | noch nicht (eigener Text im Projekt) | – | noch nicht | Supabase-Region Irland. Vor dem Einsatz der Vorlage Vercel-Region `fra1` setzen und prüfen (die Vorlage sagt „Frankfurt“) |

## Checkliste neues Kundenprojekt mit Admin

- `vercel.json` mit `{ "regions": ["fra1"] }` und im Vercel-Projekt Function Region Frankfurt setzen. Nach dem Deployment den Header `x-vercel-id` prüfen (`fra1::fra1`).
- Supabase-Projekt in der EU anlegen (Region ist später nicht änderbar). Standort im Admin unter „Datenschutzerklärung → Vorlage → Standort der Datenbank“ eintragen.
- Datenbank-Migrationen aus `sql/` ausführen (inkl. `0.12.0_legal_documents.sql`).
- Im Admin: Datenschutzerklärung (Vorlage einrichten, Text erzeugen, Platzhalter füllen) und Impressum ausfüllen.
- Auftragsverarbeitungsvertrag mit dem Kunden abschließen, bevor die Datenschutzerklärung live geht.
