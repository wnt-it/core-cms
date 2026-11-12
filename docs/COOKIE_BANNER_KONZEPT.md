# Cookie-Banner im Core: Konzept

Stand: 06.11.2026 · Status: **Phase 1 umgesetzt, noch nicht released** (Ziel-Version v0.14.0). Umgesetzt im Ordner `src/consent`, Anleitung im README, Abschnitt „Einwilligungen“. Abweichung zum Entwurf: `<ConsentProvider>` umschließt die Seite (`{children}`), weil der Zustand per Kontext an die Platzhalter geht.

Ausgangspunkt ist der Banner eines bestehenden Kundenprojekts (`src/components/consent/`). Er funktioniert, hat aber vier Lücken, die der Core schließen soll:

| Heute im Kundenprojekt | Problem | Im Core |
| :--- | :--- | :--- |
| „Ablehnen" ist ein Umriss-Button, „Akzeptieren" ein gefüllter | Nicht gleichwertig, gilt als Beeinflussung (Nudging) | Beide Buttons sind **dieselbe Komponente**, gleich groß, gleiche Ebene |
| „Einstellungen" ist nur ein kleiner Textlink | Auswahl schwerer erreichbar als „Alles akzeptieren" | Dritter, gleichwertiger Button |
| Überschrift „Ihre Privatsphäre ist uns wichtig", Text ohne Anbieter, Daten, Drittland | Überschrift steht auf der Liste irreführender Überschriften, Information zu dünn | Feste, allgemeine Überschrift ohne Blacklist-Muster, Liste der Dienste aus der Konfiguration |
| Globaler Banner, obwohl nur Maps, YouTube und Bookings eingebettet sind | Nicht nötig, gefragt werden soll direkt am Inhalt | Einbettungs-Modus (Zwei-Klick am Inhalt) |
| Auswahl liegt nur im `localStorage` des Besuchers | Wir können nichts nachweisen (Art. 7 Abs. 1 DSGVO) | **Einwilligungsprotokoll** in der Datenbank des Projekts |
| Kein Ablaufdatum, keine Versionierung | Änderungen am Dienst-Angebot lösen keine neue Frage aus | Ablauf nach 12 Monaten, neue Frage bei neuen oder wesentlich geänderten Diensten |

Rechtlicher Rahmen (zur Orientierung): § 25 TDDDG (Speichern/Auslesen auf dem Gerät braucht Einwilligung, außer technisch notwendig), Art. 6, 7 DSGVO (freiwillig, informiert, widerrufbar, nachweisbar), Orientierungshilfe der Datenschutzkonferenz für Telemedien. Als Maßstab dient vor allem die **FAQ des Landesbeauftragten für den Datenschutz Baden-Württemberg**, zusammengefasst in [REFERENZ_LFDI_BW_COOKIES_TRACKING.md](REFERENZ_LFDI_BW_COOKIES_TRACKING.md) (Stand der FAQ: März 2022). Das ist keine Rechtsberatung: **Die festen Texte sollten einmal von einem Datenschutzbeauftragten oder Anwalt gegengelesen werden**, bevor wir sie an alle Kunden ausrollen.

---

## 0. Änderungen nach Auswertung der LfDI-BW-FAQ (06.11.2026)

Die FAQ hat das Konzept an neun Stellen verändert. Alles Weitere unten ist bereits entsprechend angepasst.

| # | Erkenntnis aus der FAQ | Folge fürs Konzept |
| :--- | :--- | :--- |
| 1 | **Eindeutige ID zum Merken der Einwilligung ist nicht ausdrücklich einwilligungsfrei.** Ohne Einwilligung erlaubt ist nur der Vermerk des **Status (ja/nein)**, nicht einer eindeutigen ID (A 1.3). Meine erste Fassung speicherte eine Zufalls-ID im Browser. | Protokoll bekommt zwei Betriebsarten, **Standard „ohne ID"** (Abschnitt 5). „Mit ID" nur nach juristischer Klärung und mit Auskunft/Löschung je ID. **Das ist Entscheidung 1 unten.** |
| 2 | **Überschrift „Ihre Privatsphäre ist uns wichtig“ steht wörtlich auf der Liste irreführender Überschriften** (B 1.3.7.4). Das ist die Überschrift des bisherigen Kundenprojekts. | Feste, allgemeine Überschrift mit Bezug zur Tragweite („Einwilligung zur Datenübermittlung an externe Anbieter“), geprüft gegen die Liste. Keine Respektbekundungen. |
| 3 | **Alle wesentlichen Informationen gehören schon auf die erste Ebene** (wer, welche Daten, wozu, Drittland), ein Verweis auf die Datenschutzerklärung genügt nicht (B 1.3.4, A 4.3). | Erste Ebene listet Anbieter, Daten, Zweck und Drittland je Dienst. Bei vielen Diensten Gruppierung. |
| 4 | **Nur fragen, wo nötig, unmittelbar vor der Nutzung** (A 4.1, A 4.3). Ein pauschaler Banner auf jeder Seite ist bei reinen Einbettungen nicht nötig, und **ein Banner ohne Einwilligungspflicht ist sogar falsch** (A 1.5). | Zwei Betriebsarten: **Einbettungs-Modus** (Zwei-Klick am Inhalt, kein globaler Banner) und **Banner-Modus** (nur wenn Skripte wie Analytics global laden). Beim ersten Kundenprojekt (nur Maps, YouTube, Bookings) genügt der Einbettungs-Modus. |
| 5 | **Banner darf Datenschutz und Impressum nie verdecken**; kein erneutes Verdecken nach Klick auf den Link (A 4.1, B 2.2.1, B 2.2.9). | Auf Datenschutz- und Impressum-Seite zeigt der Core keinen Banner. |
| 6 | **Schließen, Wegklicken, Scrollen ist keine Entscheidung**, und eine Ablehnung, die nicht gespeichert wird, führt zu ständigem Neufragen (B 1.4.3, B 2.2.3). | Kein „X". Der Banner geht nur durch eine ausdrückliche Wahl weg, und **auch „Ablehnen" wird gespeichert**. |
| 7 | **Hinweis auf Freiwilligkeit und wie man widerruft** muss beim Einholen stehen (A 4.3, B 1.6.1). | Fester Satz im Banner, im Dialog und am Platzhalter. |
| 8 | **Verzichten ist besser als einwilligen.** Lokale Schriften, selbst gehostete Karten/Videos, eigene Logfile-Statistik brauchen keine Einwilligung (A 2, A 3.1). Drittland-Dienste sind auch mit Einwilligung unzulässig, wenn die Übermittlung nicht trägt (A 2.5, B 5.1.1.3). | Katalog bekommt Alternativen, Drittland-Grundlage, Prüfstand und Rolle (AV/gemeinsam). Neue **Pflicht-Vorprüfung** vor jedem Dienst (Abschnitt 3a). Phase 3 bekommt einwilligungsfreie Bausteine. |
| 9 | **Begriffe wie „Essenziell", „Vendoren", „Consent", „Wesentliche Dienste" und mehrdeutige Buttons („Bestätigen")** gelten als unverständlich oder irreführend (B 1.3.11, B 1.3.12). | Feste Wörter: „Technisch notwendig", „Alle zulassen", „Alle ablehnen", „Auswahl speichern". Der Dialog zeigt klar „An"/„Aus". |

---

## 1. Grundidee: drei Schichten

```
┌──────────────────────────────────────────────────────────────┐
│ CORE (core-cms, für alle gleich, nur bei uns änderbar)       │
│  • Feste Texte, Aussehen, Verhalten (rechtssicher)           │
│  • Dienst-Katalog (Google Maps, YouTube, Analytics …)        │
│  • Speichern der Auswahl + Protokoll-Schnittstelle           │
│  • Admin-Seite „Einwilligungen"                              │
└──────────────────────────────────────────────────────────────┘
                          ▲ wird eingebunden
┌──────────────────────────────────────────────────────────────┐
│ PROJEKT (Kundenprojekt, von uns befüllt)                     │
│  • consent.config.ts: welche Dienste, Farben, Links          │
│  • 1 Zeile im Layout, 1 Route-Datei, SQL einmal ausführen    │
└──────────────────────────────────────────────────────────────┘
                          ▲ liest / schreibt
┌──────────────────────────────────────────────────────────────┐
│ DATENBANK DES PROJEKTS (Supabase)                            │
│  • consent_events (Protokoll), consent_configs (Textstand)   │
└──────────────────────────────────────────────────────────────┘
```

Das ist dasselbe Muster wie bei der Datenschutz-Vorlage: **Der Core legt fest, das Projekt trägt nur die projektspezifischen Angaben ein.**

## 2. Was der Core festlegt und was das Projekt einstellt

**Fest im Core (nicht änderbar pro Projekt):**

- **Überschrift:** fest und allgemein, aber mit Bezug zur Tragweite, nie eine Respektbekundung und nichts von der Liste der FAQ. Vorschläge: Banner „Einwilligung zur Datenübermittlung an externe Anbieter“, Platzhalter am Inhalt „Externer Inhalt: Beim Laden werden Daten an den Anbieter übermittelt“. Ein Test im Core prüft die Überschriften gegen die Liste der in der FAQ genannten irreführenden Muster (u. a. „Ihre Privatsphäre ist uns wichtig“, „Diese Webseite verwendet Cookies“, „Wir benötigen Ihre Zustimmung“, „Cookies zustimmen“)
- **Erste Ebene enthält alles Wesentliche:** je Dienst Anbieter (namentlich), welche Daten, wozu, Hinweis auf Übermittlung in ein Drittland und mögliche Verknüpfung mit Daten des Anbieters. Nicht nur ein Link zur Datenschutzerklärung. Bei mehr als 5 Diensten werden sie nach Kategorie gruppiert, die Einzelangaben stehen aufklappbar direkt darunter (nicht erst auf Ebene 2)
- **Fester Satz zu Freiwilligkeit und Widerruf**, sinngemäß: „Ihre Zustimmung ist freiwillig und keine Bedingung für die Nutzung dieser Website. Sie können sie jederzeit widerrufen über ‚Cookie-Einstellungen' am unteren Seitenrand."
- **Beschriftungen** (fest, einfache Sprache, keine Fachwörter): „Alle zulassen", „Alle ablehnen", „Einstellungen", „Auswahl speichern", „Technisch notwendig". Nicht: Akzeptieren/Bestätigen, Essenziell, Vendoren, Consent
- „Alle zulassen" und „Alle ablehnen" sind **identisch** gestaltet (Größe, Form, Farbe, Hervorhebung, gleiche Ebene, im Dialog gleiche Reihenfolge-Logik). Es gibt im Code keinen Schalter, der das ändern könnte. Dritter, **gleichwertiger** Button „Einstellungen" (kein kleiner Textlink)
- „Alle ablehnen" lehnt **wirklich alles** ab. Keine weiteren Schalter, die danach noch manuell ausgeschaltet werden müssten
- Keine vorausgewählten Schalter. Der Dialog zeigt klar „An"/„Aus" je Dienst, nichts wird erst aktiviert und muss wieder deaktiviert werden. „Technisch notwendig" wird ohne Schalter als Information gezeigt („keine Einwilligung nötig") und ist nicht als Einwilligung formuliert
- **Kein „X", kein Schließen ohne Wahl.** Weiterscrollen, Klick daneben oder Seitenwechsel gelten nie als Zustimmung. Der Banner verschwindet nur durch eine ausdrückliche Wahl. **Auch Ablehnen wird gespeichert**, damit nicht bei jedem Besuch neu gefragt wird
- **Banner blockiert nichts und verdeckt nie Datenschutz und Impressum.** Auf diesen beiden Seiten zeigt der Core keinen Banner an (nur den kleinen Button „Cookie-Einstellungen"). Keine Cookie-Wall, keine Kopplung an Inhalte
- **Vor der Wahl keine Verbindung zu Dritten und kein Speichern auf dem Gerät** (außer der Notwendigen). Dienste laden **erst nach** Einwilligung, nie vorher
- **Widerruf jederzeit und so einfach wie Zustimmen:** kleiner fester Button „Cookie-Einstellungen" auf jeder Seite (Standard) und eine Komponente für den Footer-Link. Dort lassen sich alle Angaben zu den Diensten jederzeit nachlesen
- Auswahl läuft nach 12 Monaten ab (eigene Festlegung, die FAQ nennt keine Zahl), danach wird neu gefragt
- Alles auf **Deutsch** (Englisch erst in Phase 3)
- Protokollierung (siehe Abschnitt 5)

**Pro Projekt einstellbar (`consent.config.ts`):**

- Liste der Dienste (aus dem Katalog, plus Eigene)
- **Modus:** `"einbettung"` (nur Zwei-Klick am Inhalt, kein globaler Banner; **Standard, solange alle Dienste Einbettungen sind**), `"banner"` (globaler Banner, nötig sobald ein Skript wie Analytics auf allen Seiten laden soll) oder `"aus"` (Projekt hat keinerlei einwilligungspflichtige Dienste, nichts wird angezeigt). Der Core verweigert `"banner"` ohne einwilligungspflichtigen Dienst, denn ein Banner ohne Einwilligungspflicht ist selbst fehlerhaft
- Farben und Rundung als Variablen (CI), Platzierung (3 Vorgaben: Leiste unten, Karte unten links, Dialog mittig). Die Buttons bleiben dabei gleichwertig
- Pfade zu Datenschutz und Impressum (Standard `/datenschutz`, `/impressum`)
- Eigene Dienste, die nicht im Katalog sind (Name, Anbieter, Zweck, Datenschutz-Link)

**Nicht möglich pro Projekt:** Texte überschreiben, Buttons ungleich gestalten, Dienste vorab anhaken, Schließen-Kreuz, eigene Überschrift. Wer das braucht, ändert den Core, nicht das Projekt.

### Der Einbettungs-Modus genauer (Standard für Karten, Videos, Terminbuchung)

**Einordnung (was die FAQ sagt und was unsere Wahl ist):** Zwei-Klick ist kein Gesetzesbegriff. Gesetzlich nötig ist eine vorherige, informierte, aktive Einwilligung (Art. 4 Nr. 11, Art. 6 Abs. 1 lit. a DSGVO, § 25 TDDDG). Die FAQ nennt die Zwei-Klick-Lösung als datenschutzfreundliche Umsetzung (A 2, Art. 25 DSGVO) und bei Kartendiensten ausdrücklich „erforderlich“ (A 2.3, so die Auffassung des LfDI). Dass die Abfrage „unmittelbar vor der ersten Nutzung“ erfolgt (A 4.3) und Einwilligungen nur dort eingeholt werden „sollten“, wo sie nötig sind (A 4.1), ist die Linie der Behörde. Ein globaler Banner bleibt zulässig (A 4.3 nennt „Banner oder ähnlich gestaltetes Element“). **Der Einbettungs-Modus als Standard ist unsere Entscheidung auf dieser Grundlage, keine Vorgabe.** Der Platzhalter am Inhalt (`ConsentGate`) trägt dieselben Pflichtangaben wie der Banner, nur für diesen einen Dienst:

- Überschrift mit Tragweite, allgemein: „Externer Inhalt: Beim Laden werden Daten an den Anbieter übermittelt“ (der Anbieter steht direkt darunter namentlich)
- Anbieter namentlich, welche Daten (mindestens IP-Adresse und aufgerufene Seite), Zweck, Hinweis auf Drittland und mögliche Verknüpfung mit Daten, die der Anbieter schon hat
- Der feste Freiwilligkeits-/Widerrufssatz und Link zur Datenschutzerklärung
- Ein Button „Inhalt laden und {Dienst} erlauben". Nicht-Laden ist die Voreinstellung und braucht keinen Klick. Die Erlaubnis gilt für diesen Dienst (auf allen Seiten, 12 Monate), wird protokolliert und ist über „Cookie-Einstellungen" widerrufbar
- Es gibt **keinen globalen Banner**. Der kleine Button „Cookie-Einstellungen" (und der Footer-Link) bleibt immer, damit Widerruf und Nachlesen möglich sind

Für das erste Kundenprojekt (nur Google Maps, YouTube, Microsoft Bookings) reicht damit der Einbettungs-Modus. Besucher, die nie eine Karte oder ein Video aufrufen, werden gar nicht gefragt.

## 3. Dienst-Katalog (der modulare Teil)

Der Core liefert eine Liste bekannter Dienste. Jeder Eintrag enthält alles, was Banner **und** Datenschutzerklärung brauchen:

```ts
{
  id: "google-maps",
  kategorie: "funktional",            // funktional | statistik | marketing
  art: "einbettung",                  // einbettung (Zwei-Klick am Inhalt) | skript (globaler Banner nötig)
  name: "Google Maps",
  anbieter: "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland",
  zweck: "Zeigt Standorte auf einer Karte. …",
  daten: "IP-Adresse, Kartenausschnitt; Google kann Cookies setzen.",
  drittland: true,                    // löst den Hinweis zur Übermittlung aus
  datenschutzUrl: "https://policies.google.com/privacy",
  speicher: [{ name: "NID", art: "cookie", dauer: "6 Monate" }],   // für Aufräumen beim Widerruf
  revision: 1,                        // wird nur bei WESENTLICHEN Änderungen erhöht (siehe 6)
  datenschutzBaustein: "karten",      // Verweis auf den Abschnitt der Datenschutz-Vorlage
  // Pflichtangaben aus der Vorprüfung (Abschnitt 3a); ohne sie lässt sich kein Katalogeintrag anlegen:
  rolle: "eigener-verantwortlicher",  // auftragsverarbeiter (AV-Vertrag nötig) | gemeinsam (Art. 26) | eigener-verantwortlicher
  drittlandGrundlage: "EU-US Data Privacy Framework, Standardvertragsklauseln",
  geprueftAm: "2026-11-06",           // Admin warnt, wenn älter als 12 Monate
  alternative: "OpenStreetMap über eigenen Proxy oder Link auf die Karte statt Einbettung",  // wird im Entwickler-Hinweis gezeigt
}
```

Im Projekt:

```ts
// consent.config.ts
import { defineConsentConfig, dienst } from "core-cms/src/consent";

export const consentConfig = defineConsentConfig({
  dienste: [
    dienst("google-maps"),
    dienst("youtube"),
    dienst("microsoft-bookings"),
    dienst("eigener-dienst", { kategorie: "funktional", name: "…", anbieter: "…", zweck: "…", datenschutzUrl: "…" }),
  ],
  design: { akzent: "#1f6f3f", platzierung: "leiste-unten" },
});
```

**Skalierung:** Ein neuer Dienst ist ein Katalogeintrag im Core, danach in jedem Projekt mit einer Zeile nutzbar. Ein Dienst, den es (noch) nicht gibt, geht als „Eigener Dienst" ohne Core-Änderung.

### 3a. Vorprüfung vor jedem Dienst: erst verzichten, dann einwilligen

Die FAQ rät ausdrücklich, einwilligungspflichtige Technik möglichst zu vermeiden. Das bauen wir als feste Reihenfolge in unseren Ablauf ein (Checkliste im Projekt, später als Entwickler-Hinweis im Admin):

1. **Geht es ohne Dritten?** Schriften lokal (im ersten Kundenprojekt schon so, `next/font` liefert vom eigenen Server), Karte als Link oder Bild, Video verlinken oder selbst hosten, Social-Media nur als normale Links, Zitate statt eingebetteter Beiträge.
2. **Gibt es eine datenschutzfreundliche Variante?** Zum Beispiel OpenStreetMap über eigenen Proxy statt Google Maps, Maps4BW bei Kunden in Baden-Württemberg, Statistik aus dem eigenen Server-Log statt Google Analytics.
3. **Trägt die Übermittlung ins Drittland?** Ohne tragfähige Grundlage ist der Dienst auch mit Einwilligung unzulässig. Der Katalog nennt die Grundlage und das Prüfdatum je Dienst.
4. **Vertrag und Rolle geklärt?** AV-Vertrag (Art. 28) oder Vereinbarung bei gemeinsamer Verantwortung (Art. 26). Steht je Dienst im Katalog.
5. **Ist der Kunde eine Behörde oder öffentliche Stelle?** Dann ist Einwilligung in der Regel keine wirksame Grundlage, also keine einwilligungspflichtigen Dienste.
6. **Besondere Kategorien (Gesundheit, politische Meinung …)?** Dann braucht es eine ausdrückliche Einwilligung, die dieser Banner nicht abdeckt. Vorher klären.
7. **Erst dann** den Dienst im Banner/Gate aufnehmen.

Das Werbe-Framework IAB-TCF und fertige CMP-Standards verwenden wir nicht (die FAQ weist darauf hin, dass sie nicht automatisch rechtskonform sind).

**Synergie mit der Datenschutz-Vorlage (Phase 2):** Der Katalog kennt zu jedem Dienst den passenden Datenschutz-Baustein. Dann zieht sich der Abschnitt „Karten" automatisch in die Datenschutzerklärung, sobald Google Maps im Banner steht. Das erledigt auch den offenen Punkt „zuschaltbare Bausteine" aus dem [BACKLOG](../BACKLOG.md). Bis dahin trägt man den Abschnitt wie bisher im Admin ein.

## 4. Bausteine für das Projekt (kleine, stabile Oberfläche)

Alles, was das Projekt benutzt, ist ein Export aus `core-cms/src/consent`. **Das ist die öffentliche Schnittstelle**, nur sie unterliegt Versionsnummern. Alles andere ist intern und darf sich jederzeit ändern.

| Baustein | Zweck |
| :--- | :--- |
| `ConsentProvider` | Einmal im Layout. Zeigt je nach Modus (siehe Abschnitt 2) Banner und Dialog, immer den Button „Cookie-Einstellungen". Blendet den Banner auf Datenschutz- und Impressum-Seite aus. |
| `ConsentGate` | Umschließt eingebettete Inhalte (iframe). Ohne Einwilligung steht dort ein Platzhalter mit „Inhalt laden und Dienst erlauben". Ersetzt `ConsentEmbed`. |
| `ConsentScript` (Phase 2) | Lädt ein Skript (z. B. Analytics) erst nach Einwilligung. |
| `ConsentSettingsLink` | Link/Button „Cookie-Einstellungen" für den Footer. |
| `useConsent(id)` | Für Sonderfälle: „Ist Dienst X erlaubt?" |
| `defineConsentConfig`, `dienst` | Konfiguration (siehe oben). |

**Widerruf bei bereits geladenen Skripten:** Ein geladenes Skript lässt sich nicht zuverlässig „entladen". Deshalb: Bei Widerruf löscht der Core die im Katalog verzeichneten Cookies/Speichereinträge des Dienstes und lädt die Seite neu. Das ist einfach und belastbar.

**Google Consent Mode v2** (für Analytics/Ads) kommt als optionaler Adapter in Phase 2, nicht in den Kern.

## 5. Nachweis: Einwilligungsprotokoll

### Wo wird gespeichert?

| Option | Bewertung |
| :--- | :--- |
| **A. Supabase-Datenbank des jeweiligen Projekts** | **Empfohlen.** Daten bleiben beim Kunden als Verantwortlichem, wir sind wie schon bei Anfragen nur Auftragsverarbeiter. Keine neue Infrastruktur, Rechte und Daten-Export laufen über das, was es schon gibt. |
| B. Zentrale Datenbank bei WNT-IT | Nein. Wir würden Daten aller Kunden bündeln (eigene datenschutzrechtliche Rolle, ein Ziel für Angriffe, ein Ausfallpunkt). |
| C. Fertiger Dienst (Cookiebot, Usercentrics …) | Möglich, aber laufende Kosten pro Kunde, ein weiterer Dienstleister in jeder Datenschutzerklärung, weniger Kontrolle über Aussehen. Für unser Abo-Modell nicht stimmig. |
| D. Nur im Browser | Reicht nicht. Der Besucher könnte es löschen und wir könnten nichts belegen. |

### Datenmodell (Migration `sql/0.14.0_consent.sql`)

```sql
-- Textstand: was genau hat der Besucher gesehen? Pro Stand eine Zeile, unveränderlich.
create table if not exists public.consent_configs (
  hash        text primary key,
  created_at  timestamptz not null default now(),
  snapshot    jsonb not null          -- Texte, Dienste (mit Anbieter, Zweck), Core-Version
);

-- Protokoll: eine Zeile pro Entscheidung. Nur anhängen, nie ändern.
create table if not exists public.consent_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),   -- Zeit vom Server, nicht vom Browser
  consent_id  uuid,                                 -- NUR im Modus „mit ID": zufällige Kennung des Browsers. Im Standard „ohne ID" leer.
  action      text not null check (action in ('accept_all','reject_all','custom','expired')),
  trigger     text not null check (trigger in ('banner','settings','embed')),
  choices     jsonb not null,                       -- {"google-maps": true, "youtube": false, …}
  config_hash text not null references public.consent_configs(hash),
  core_version text not null,
  page_path   text                                  -- nur Pfad, ohne Query
);
create index if not exists consent_events_consent_id_idx on public.consent_events (consent_id, created_at desc);
create index if not exists consent_events_created_at_idx on public.consent_events (created_at);

-- Rechte: Besucher dürfen nichts direkt lesen oder schreiben. Geschrieben wird nur über den Server (Service-Role),
-- lesen dürfen nur angemeldete Admins, ändern oder löschen niemand (außer die Aufräumfunktion unten).
alter table public.consent_events enable row level security;
alter table public.consent_configs enable row level security;
revoke all on public.consent_events, public.consent_configs from anon;
-- Policies: select für authenticated; kein insert/update/delete für anon/authenticated.
-- Trigger verhindert update/delete, Aufräumfunktion consent_cleanup() (security definer) löscht nach Frist.
```

**Was bewusst nicht gespeichert wird:** IP-Adresse, Name, E-Mail, Browserkennung, Bildschirmgröße oder Ähnliches (kein Fingerprinting). Gespeichert werden nur Serverzeit, Auswahl, Textstand, Core-Version und Seitenpfad.

### Wozu das Protokoll dient (und wozu nicht)

Entschieden (06.11.2026): **Start ohne ID, ergänzt um Tests.** Das Protokoll ohne ID beweist **nicht**, dass eine bestimmte Person eingewilligt hat. Es dient dazu:

- den **Wortlaut jeder Textfassung** samt Gültigkeitszeitraum zu archivieren (`consent_configs`), das ist der wertvollste Teil
- zu zeigen, dass der Mechanismus **im Betrieb lief** und Entscheidungen tatsächlich ankamen
- **Fehler zu erkennen**: keine Einträge heißt Banner oder Endpunkt kaputt, auffällig fast nur Zustimmung heißt Gestaltung prüfen
- eine **Zustimmungsquote** auszuweisen

Gegen die Behauptung „ich habe nicht eingewilligt, aber der Dienst wurde geladen“ hilft vor allem der **technische Nachweis** (siehe unten): Ohne Klick wird nichts geladen.

#### Wichtig: mit oder ohne ID? (Folge aus der LfDI-FAQ)

**Frage: Wie lässt sich dann zuordnen, WER WAS eingewilligt hat?** Gar nicht auf eine Person, und das gilt auch mit ID. Ohne Name, E-Mail oder IP ist die ID nur ein Pseudonym für einen Browser. Eine Person ließe sich nur zuordnen, wenn sie ihre ID selbst nennt (aus dem Browser ausgelesen). Wo wir die Person kennen, ist das ein **anderer Fall mit eigenem Nachweis**, nicht der Cookie-Banner: Newsletter (Double-Opt-in-Protokoll), Kontaktformular, Anmeldung. Beim Banner belegen wir stattdessen das **Verfahren**: Was wurde angezeigt (Textstand), wie sah die Entscheidung aus (Auswahl, Zeit), und dass vor der Einwilligung nichts geladen wurde. Außerdem sagt Art. 11 DSGVO nach meinem Verständnis, dass ein Verantwortlicher keine zusätzlichen Daten sammeln muss, nur um Betroffenenrechte erfüllen zu können. Die ID bringt also vor allem den **Verlauf eines Browsers** (Zustimmung, später Widerruf), nicht das „Wer“.

Die FAQ nennt als einwilligungsfrei nur den Vermerk des **Status (ja/nein), nicht einer eindeutigen ID** (A 1.3). Eine Zufalls-ID im Browser (so waren meine ersten Entwurfsseiten) ist damit nicht ausdrücklich gedeckt. Am Markt ist sie üblich, weil sie einen späteren Widerruf dem früheren Eintrag zuordnet. Deshalb zwei Betriebsarten, einstellbar im Projekt (`protokoll: "ohne-id" | "mit-id"`):

| | **ohne ID (Standard)** | mit ID |
| :--- | :--- | :--- |
| Im Browser gespeichert | nur Auswahl (ja/nein je Dienst), Ablaufdatum, Textstand | zusätzlich zufällige ID |
| Im Protokoll | Zeit, Auswahl, Textstand, Version, Seitenpfad | zusätzlich die ID |
| Belegt | **Dass und wie der Mechanismus lief**: Was wurde wann angezeigt, wie wurde entschieden (Zustimmungsquote), seit wann gilt welcher Text. Das genügt als Nachweis des Verfahrens (Rechenschaftspflicht). | Zusätzlich: Verlauf **eines** Browsers samt späterem Widerruf |
| Nicht möglich | Einen Eintrag einer bestimmten Person zuordnen. (Auch mit ID wäre das ohne IP/Name nur möglich, wenn die Person ihre ID nennt.) | |
| Rechtliches Risiko | gering | Hängt an der Auslegung von § 25 TDDDG. Außerdem müssen Auskunft (Art. 15) und Löschung (Art. 17) **anhand der ID** möglich sein (B 4.1.5). Dafür bekommt der Admin Suche und Löschen je ID. |

**Empfehlung:** Start mit „ohne ID". „Mit ID" erst einschalten, wenn die juristische Prüfung es ausdrücklich freigibt. Der Wechsel ist ein Schalter, die Tabelle ist für beides vorbereitet. Im Modus „ohne ID" ist ein **Widerruf ein neuer Eintrag mit der geänderten Auswahl**, er wird nur nicht dem früheren Eintrag zugeordnet. Der Browser selbst kennt seinen Verlauf, der Server muss ihn nicht kennen.

**Aufbewahrung:** Standard 3 Jahre ab Ende des Jahres der Einwilligung (übliche Verjährungsfrist). Aufräumen über `consent_cleanup()`, anstoßbar im Admin und optional per Supabase-Zeitplan. Die Frist steht auch in der Datenschutz-Vorlage.

### Ablauf

1. Besucher klickt (Banner, Einstellungen oder Platzhalter am Embed).
2. Browser speichert sofort in `localStorage` (Schlüssel `cms_consent`): Version des Speicherformats, Auswahl (ja/nein je Dienst, **auch bei Ablehnung**), Ablaufdatum, Entscheidungs-Schlüssel, im Modus „mit ID" zusätzlich die `consent_id`. Die Dienste reagieren **sofort**, ohne auf den Server zu warten. Vorher werden keine Verbindungen zu Dritten aufgebaut.
3. Browser schickt die Entscheidung an `POST /api/consent` (mit `keepalive`, damit sie auch beim Seitenwechsel ankommt).
4. Der Server prüft streng: nur bekannte Dienst-IDs, nur true/false, kleine Nutzlast. Missbrauchsschutz: im Modus „mit ID" höchstens N Einträge je `consent_id` und Stunde, im Modus „ohne ID" eine Obergrenze Einträge pro Minute insgesamt. Er berechnet den Textstand **selbst aus der Projekt-Konfiguration** (nicht aus dem, was der Browser behauptet), legt den Snapshot bei Bedarf an und schreibt den Eintrag mit Serverzeit.
5. **Schlägt Schritt 3/4 fehl** (offline, Datenbank gerade nicht erreichbar): Die Auswahl des Besuchers gilt trotzdem, der Eintrag wartet im Browser und wird beim nächsten Seitenaufruf erneut gesendet. Die Admin-Seite zeigt einen Hinweis, wenn die Tabelle fehlt (Migration nicht ausgeführt).

Der Textstand im Snapshot ist der eigentliche Beweis: Er zeigt später wörtlich, was dem Besucher angezeigt wurde.

### Technischer Nachweis: Browser-Tests bei jedem Release

Der stärkste Beleg gegen „ohne meine Zustimmung geladen“ ist, dass es technisch nicht geht. Das wird bei **jeder Core-Version** automatisch geprüft und das Ergebnis aufgehoben:

1. **Vor einer Entscheidung:** Beim Seitenaufruf gehen **keine Anfragen an Fremddomänen** (Google, YouTube, Microsoft …), und im Browser liegt **nichts außer dem Notwendigen** (Cookies, Local/Session Storage, IndexedDB leer, abgesehen von der Auswahl selbst).
2. **Nach „Alle ablehnen“:** weiterhin keine Fremd-Anfragen, nur die Ablehnung ist gespeichert.
3. **Nach „Alle zulassen“ oder Klick am Platzhalter:** genau die Dienste laden, die erlaubt wurden, keine anderen.
4. **Nach Widerruf:** Speichereinträge des Dienstes sind weg, keine neuen Fremd-Anfragen.
5. **Datenschutz- und Impressum-Seite:** kein Banner, Inhalt vollständig sichtbar.
6. **Überschriften** gegen die Liste der FAQ (siehe Abschnitt 2).
7. **Gleichwertigkeit:** „Alle zulassen“ und „Alle ablehnen“ haben dieselbe Größe und Ebene.

Die Tests laufen gegen eine Beispielseite im Core und zusätzlich gegen jedes Kundenprojekt beim Heben der Core-Version (Skill `cms-release`). Das Ergebnis (Datum, Core-Version, Projekt, bestanden/nicht) wird im Release festgehalten und ist der Beleg, dass das Verfahren zu diesem Zeitpunkt korrekt arbeitete. Technik: Playwright, Netzwerk- und Speicher-Mitschnitt.

### Einbindung im Projekt (3 Handgriffe)

```ts
// app/api/consent/route.ts
import { createConsentHandler } from "core-cms/src/consent/server";
import { consentConfig } from "@/consent.config";
export const POST = createConsentHandler(consentConfig);
```

```tsx
// app/layout.tsx: im <body>
<ConsentProvider config={consentConfig}>{children}</ConsentProvider>
```

Dazu `sql/0.14.0_consent.sql` einmal im Supabase-SQL-Editor ausführen. Das war es.

## 6. Updates ohne Brüche

1. **Opt-in:** Ein Projekt, das den Provider nicht einbindet, merkt von dem Feature nichts. Ein Core-Update ändert dort nichts.
2. **Stabile Oberfläche:** Nur die Exporte aus Abschnitt 4 sind öffentlich (Semver). Alles andere ist intern.
3. **Versioniertes Speicherformat:** Der gespeicherte Eintrag trägt `v`. Neue Core-Versionen haben kleine Umsteiger (v1→v2). Ein unbekannter, neuerer Stand wird als „noch nicht entschieden" behandelt, nie als Zustimmung.
4. **Nur additive Datenbankänderungen:** Neue Spalten sind optional (nullable) oder haben einen Standardwert. Spalten werden nicht umbenannt oder gelöscht. Zusätzliche Daten gehen in ein offenes `jsonb`-Feld.
5. **Zwei Schlüssel statt einem:**
   - *Entscheidungs-Schlüssel* aus Dienst-ID + `revision`: ändert sich nur bei **wesentlichen** Änderungen (neuer Dienst, neuer Zweck, neuer Anbieter, neues Drittland). Dann wird nur für diesen Dienst neu gefragt, die übrigen Entscheidungen bleiben.
   - *Snapshot-Hash* über alle Texte: ändert sich bei jeder Textänderung (auch Tippfehler), löst aber **keine** neue Frage aus, wird nur im Protokoll mitgeführt.
6. **Texte liegen im Core-Release, nicht im Live-Branch.** Anders als die Datenschutz-Vorlage (die lesen die Projekte live von GitHub) ändert sich beim Banner das, was der Besucher *im Moment der Einwilligung* sieht. Das soll nachvollziehbar an einem Release hängen. Deshalb: Textänderung = Release (Skill `cms-release`).
7. **Testbare Logik:** Speichern, Ablauf, Umsteiger, Schlüsselbildung liegen in einem reinen TypeScript-Modul ohne React. Dafür bekommt der Core als Erstes ein Testwerkzeug (heute prüft er nur `tsc`).
8. **Fehlende Migration wird sichtbar:** Die Versions-/Admin-Seite meldet „Migration 0.14.0 fehlt", statt dass still nichts protokolliert wird.

## 7. Aktivierung und Verwaltung

**Empfehlung: Aktivieren tun wir, nicht der Kunde.** „Brauchen wir einen Banner" ist eine Projektentscheidung bei Einrichtung (3 Handgriffe oben), keine Kundeneinstellung. Das hält den Aufwand klein und das Verhalten einheitlich.

Im Admin bekommt der Kunde (neue Seite „Einwilligungen" unter „System", erscheint automatisch über `coreAdminPages`):

- **Status:** Banner aktiv, welche Dienste eingetragen sind, Migration ok
- **Protokoll:** Liste der Entscheidungen, Export als CSV (für Behördenanfragen). Nur im Modus „mit ID": Suche und Verlauf je `consent_id` sowie Auskunft und Löschen je ID (Art. 15, 17)
- **Prüfstand der Dienste:** Warnung, wenn „geprüft am" eines Dienstes älter als 12 Monate ist oder die Datenschutz-Vorlage den Dienst nicht beschreibt
- **Kennzahlen:** Anteil „Alle akzeptiert / Alle abgelehnt / Individuell" (einfach, später)
- **Aufräumen** nach Frist

Der Kunde **bearbeitet** nichts am Banner. Falls später gewünscht, wäre ein Schalter „Dienst X vorübergehend aus" in `site_settings` ein kleiner nächster Schritt (Phase 3).

Das Protokoll ist eine normale Tabelle und erscheint damit automatisch im bestehenden Daten-Export.

## 8. Datenschutz-Vorlage anpassen

Der feste Abschnitt „Cookies und Einwilligungsmanagement" in `datenschutz-vorlage.json` bekommt (Änderung nur Text, kein Release):

- was im Browser gespeichert wird (Auswahl ja/nein je Dienst, Ablaufdatum; nur im Modus „mit ID" zusätzlich eine Zufalls-ID) und dass das **technisch notwendig** ist und ohne Einwilligung erfolgt
- was protokolliert wird (Zeitpunkt, Auswahl, Textstand, ggf. ID), kein Name, keine IP
- Rechtsgrundlage für das Protokoll: Art. 6 Abs. 1 lit. c DSGVO i. V. m. Art. 7 Abs. 1 und Art. 5 Abs. 2 (Nachweis- und Rechenschaftspflicht)
- Speicherdauer (3 Jahre) und Widerrufsmöglichkeit (Button „Cookie-Einstellungen")
- Der bisherige Platzhalter „Name des Eintrags im Local Storage" (`consentKey`) entfällt, weil der Schlüssel jetzt fest `cms_consent` heißt
- Der Text darf **keine Einwilligung für Technisch Notwendiges** suggerieren (FAQ A 1.5) und muss zu den Aussagen im Banner passen
- Tabelle Technik im Einsatz: Cookies **und** Web Storage vollständig nennen (B 1.3.5.6)

## 9. Umsetzung in Phasen

| Phase | Inhalt | Version |
| :--- | :--- | :--- |
| **1: Fundament** | Konfiguration + Katalog mit Pflichtfeldern (Google Maps, YouTube, Microsoft Bookings, eigener Dienst), Modi „einbettung"/„banner"/„aus", Banner und Einstellungs-Dialog nach den Vorgaben in Abschnitt 2, `ConsentGate` mit Pflichtangaben, `ConsentSettingsLink`, Speichern + Ablauf + Umsteiger, Protokoll „ohne ID" (Modus „mit ID" ist vorbereitet, aber aus) + Endpunkt + SQL, Admin-Seite „Einwilligungen" (Liste, CSV, Prüfstand), Textupdate Datenschutz-Vorlage, Tests der Logik **und Browser-Tests als Nachweis (Abschnitt 5)**. **Umbau des ersten Kundenprojekts.** | v0.14.0 |
| **2: Skripte & Texte** | `ConsentScript`, Adapter für Analytics (Matomo/Plausible vor GA4, wegen Drittland) und Consent Mode v2, Cookies beim Widerruf löschen, Datenschutz-Abschnitte automatisch aus dem Katalog, Aufräumen per Zeitplan, Modus „mit ID" samt Auskunft/Löschen nach juristischer Freigabe | v0.15.x |
| **3: Komfort und Verzicht** | Kennzahlen, Schalter je Dienst im Admin, Englisch, Prüfskript „findet die Website Drittanbieter, die nicht im Banner stehen?" **Prüfen, ob einwilligungsfreie Bausteine nach FAQ A 2/A 3 möglich sind:** Karte über eigenen OpenStreetMap-Proxy; **cookielose Seitenaufruf-Zählung** (nur Zähler je Seite und Tag, keine IP, keine Kennung, keine „Besucher“, keine Auswertung einzelner Personen). Einwilligungsfrei nur unter den Bedingungen in Abschnitt 11, sonst Einwilligung oder Verzicht. | später |

**Umbau des ersten Kundenprojekts:** Die Dienst-IDs (`google-maps`, `youtube`, `microsoft-bookings`) bleiben gleich, `ConsentEmbed` wird `ConsentGate`, die Dateien in `src/components/consent/` fallen weg. Weil alle drei Dienste Einbettungen sind, läuft das Projekt im **Einbettungs-Modus ohne globalen Banner**. Dabei einmal prüfen: Gibt es für Maps, YouTube und Bookings eine Alternative ohne Dritten (Abschnitt 3a)? Und setzt die Seite für anonyme Besucher wirklich keine Cookies (die Supabase-Middleware des Core schreibt Cookies nur bei bestehender Anmeldung, das wird in Phase 1 geprüft)? Die alten Einwilligungen (`ane_consent`) übernehmen wir **nicht**, alle Besucher werden einmal neu gefragt: Für die alten gibt es kein Protokoll, und wir starten sauber.

## 10. Entscheidungen, die ich von dir brauche

1. ~~Protokoll zunächst ohne ID~~ **Entschieden am 06.11.2026: ohne ID, plus Browser-Tests als Nachweis.** „Mit ID" bleibt ein Schalter für später, nach juristischer Klärung.
2. **Protokoll in der Datenbank des jeweiligen Projekts** (Option A): ok?
3. **Aktivierung nur durch uns im Projekt**, Kunde sieht im Admin nur das Protokoll: ok?
4. **Standard ist der Einbettungs-Modus** (Zwei-Klick am Inhalt, kein globaler Banner), globaler Banner nur bei Skripten wie Analytics: ok?
5. **Alle Besucher des ersten Kundenprojekts einmal neu fragen** statt alte Auswahl zu übernehmen: ok?
6. **Aufbewahrung 3 Jahre, keine IP-Adresse speichern:** ok?
7. **Texte einmal juristisch gegenlesen lassen**, bevor Phase 1 an Kunden geht: Wer macht das (Datenschutzbeauftragter, Anwalt)? Mitgeben: Frage zur ID (Punkt 1), Überschriften-Muster, Text der ersten Ebene.

## 11. Einwilligungsfreie Statistik: Bedingungen

Die FAQ (A 3.1) hält Reichweitenanalyse ohne Einwilligung „in der Regel“ für möglich. Das heißt **nicht rechtsfrei**:

- **Warum keine Einwilligung nach TDDDG:** Es wird nichts auf dem Gerät gespeichert oder ausgelesen (kein Cookie, kein Fingerprinting). IP-Adresse und Browserkennung schickt der Browser von selbst mit.
- **Die DSGVO gilt trotzdem.** Die IP-Adresse ist ein personenbezogenes Datum. Rechtsgrundlage ist dann **nicht Einwilligung, sondern berechtigtes Interesse** (Art. 6 Abs. 1 lit. f) mit dokumentierter Abwägung, Information in der Datenschutzerklärung und **Widerspruchsrecht** (Art. 21).
- **Zweckbindung ist der Kern.** Erlaubt ist nur eine **aggregierte Statistik**. Wer dieselben Daten benutzt, um einzelne Besucher wiederzuerkennen, ihre Pfade zu verfolgen, Daten zu verknüpfen oder sie für andere Zwecke zu verwenden, überschreitet das. Dann ist es Tracking und braucht Einwilligung (oder ist gar nicht zulässig). Ihre Frage ist also berechtigt: **Missbrauch hebt die Einwilligungsfreiheit auf.**
- **Bedingungen laut FAQ:** lokale Auswertung, keine externen Dienste, datensparsame Konfiguration, kein Zusammenführen, keine Zweckentfremdung. Kennungen durch Hashes oder User-IDs zu ersetzen gilt nicht als Anonymisierung (A 3.2).
- **Technische Folge für uns:** Auf Vercel gibt es kein eigenes Logfile, das wir auswerten könnten, und Vercel-Logs sind kurzlebig. Ein einwilligungsfreier Baustein wäre deshalb ein **eigener Zähler**: je Seite und Tag nur eine Zahl, **keine IP, kein User-Agent, keine Kennung**, daher auch **keine „eindeutigen Besucher“** (die bräuchten Wiedererkennung). Der Baustein bekommt keine Schnittstelle, mit der sich einzelne Aufrufe auslesen lassen.
- **Vorbehalt:** Das ist die Sicht des LfDI BW. Andere Aufsichtsbehörden sind teils strenger. Bei Bedarf juristisch prüfen lassen (Entscheidung 7).
