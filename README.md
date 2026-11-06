# core-cms

Zentrales, versioniertes CMS-Core-Package für WNT-IT Next.js/Supabase-Projekte.

Einzige zentrale Stelle für den Core: Projekte mit Admin/Backend installieren dieses Package
als versionierte Dependency (`package.json`) und binden die Teile per Re-Export ein.
Das frühere Datei-Kopier-Skript `scripts/sync-core.ps1` und das Repo `template` gibt es
nicht mehr (entfernt am 2026-10-19). Projekte ohne Admin/Backend brauchen keinen Core.

## Scope

**Core CMS enthält:**
- Auth (Login, Registrierung, Passwort vergessen, Passwort ändern)
- Admin-Dashboard-Shell + Site-Settings
- Media Library + Upload
- E-Mail-Versand (Resend als Standard-Provider, SMTP als Fallback)
- Submissions/Posteingang (generisch, siehe `src/submissions`)
- Supabase-Client-Factory + zentrale Typen

**Bleibt im jeweiligen Kundenprojekt:**
- Kundenspezifische Seiten/Inhalte
- Design/Theme/Branding
- Individuelle Formularfelder (über `metadata` an die generische Submissions-Funktion)

## Installation in einem Kundenprojekt

Solange kein privates npm-Registry genutzt wird, als Git-Dependency einbinden:

```json
"dependencies": {
  "core-cms": "github:wnt-it/core-cms#v0.7.0"
}
```

## Lokale Entwicklung / Tests (vor dem ersten GitHub-Release)

Solange `core-cms` noch nicht als `github:...#vX.Y.Z` released ist, bindet man es lokal über
eine `file:`-Dependency ein (`"core-cms": "file:../core-cms"`). npm legt dafür einen **Symlink**
in `node_modules/core-cms` an, der auf den echten `core-cms`-Ordner zeigt — das hat zwei
Konsequenzen, die im Kundenprojekt (nicht in core-cms selbst) nachgezogen werden müssen:

1. **`peerDependencies` (`@supabase/ssr`, `@supabase/supabase-js`, `next`, `react`, `react-dom`)
   dürfen in core-cms nicht lokal mitinstalliert werden**, sonst gibt es zwei Kopien derselben
   Bibliothek (core-cms' eigene + die des Kundenprojekts) und TypeScript meldet Typkonflikte.
   Die `.npmrc` in diesem Repo (`omit=peer`) verhindert das bei jedem `npm install` hier.
2. **Modulauflösung über den Symlink hinweg**: Sowohl TypeScript als auch Webpack folgen einem
   Symlink standardmäßig zu seinem *echten* Pfad und suchen `node_modules` von dort aus weiter —
   das findet die peerDependencies des Kundenprojekts NICHT (core-cms liegt als Sibling-Ordner,
   nicht unterhalb von `node_modules` im Kundenprojekt). Muss im **Kundenprojekt** so konfiguriert
   werden:
   - `tsconfig.json`: `"preserveSymlinks": true` in `compilerOptions`
   - `next.config.mjs`: `webpack: (config) => { config.resolve.symlinks = false; return config; }`
   - zusätzlich `transpilePackages: ['core-cms']` (core-cms liefert unkompilierte `.ts`/`.tsx`-Quellen)
3. **Tailwind v4 Content-Scan findet core-cms nicht automatisch**: Tailwind v4 (`@import "tailwindcss";`)
   scannt standardmäßig nur Dateien innerhalb des Kundenprojekt-Ordners. `core-cms` liegt als
   Sibling-Ordner außerhalb (auch über den `file:`-Symlink hinweg) und wird **nicht** mitgescannt.
   Ohne Gegenmaßnahme fehlen alle Tailwind-Klassen, die core-cms-Komponenten benutzen, im
   generierten CSS — die UI (z.B. Submissions-Admin) rendert unstyled. Fix im **Kundenprojekt**,
   in der globalen CSS-Datei direkt nach `@import "tailwindcss";`:
   ```css
   @source "../../core-cms/src";
   ```
   (Pfad relativ zur CSS-Datei anpassen.)

**Sobald core-cms über GitHub als echte Dependency installiert wird** (nicht mehr per `file:`),
entfällt Punkt 2 komplett — npm kopiert das Package dann als echten Unterordner in
`node_modules/core-cms`, kein Symlink mehr, normale Node-Modulauflösung greift wieder.

## Benötigte Umgebungsvariablen im Kundenprojekt

Werden **niemals** im Admin-Backend eingetragen/gespeichert (Sicherheitsrisiko + zirkuläre
Abhängigkeit), sondern ausschließlich als Vercel-Environment-Variablen pro Projekt gesetzt:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Pflicht ab v0.3.1 - siehe unten
ENCRYPTION_KEY=          # Pflicht ab v0.7.0 - verschlüsselt das SMTP-Passwort
RESEND_API_KEY=          # falls Resend als Provider gewählt wird
```

**`ENCRYPTION_KEY` (ab v0.7.0 Pflicht):** Zufälliger, geheimer Wert (mind. 32 Zeichen, z.B.
`openssl rand -hex 32`), pro Projekt in Vercel setzen. Es gibt keinen Ersatzschlüssel mehr
(das Repo ist öffentlich). Ohne den Wert lässt sich das SMTP-Passwort weder speichern noch
lesen. Wurde ein Passwort mit dem früheren Ersatzschlüssel gespeichert, muss es nach dem
Setzen des Werts im Admin einmal neu eingegeben werden.

**`SUPABASE_SERVICE_ROLE_KEY` (ab v0.3.1 Pflicht):** Wird ausschließlich serverseitig genutzt,
um SMTP-Zugangsdaten aus der Tabelle `email_settings` zu lesen (bewusst nicht über den
anon-Key, da `site_settings` öffentlich lesbar ist und SMTP-Daten dort nicht liegen dürfen —
siehe Sicherheitsfix v0.3.1). Zu finden im Supabase-Dashboard unter
**Project Settings → API → service_role secret**. Niemals mit `NEXT_PUBLIC_`-Präfix setzen,
niemals im Browser verwenden. Ohne diese Variable funktioniert weiterhin alles außer dem
SMTP-Versand.

**SMTP-Zugangsdaten** (Host, Port, Benutzer, Passwort, Absender, Empfänger) werden ausschließlich
im Admin unter „Einstellungen & SMTP“ gepflegt (Tabelle `email_settings`). Es gibt keine
`SMTP_*`-Umgebungsvariablen und keine Standardwerte: Ist etwas nicht gepflegt, wird keine
E-Mail gesendet (die Anfrage bleibt trotzdem im Posteingang gespeichert).

## Neue Admin-Seiten automatisch an alle Projekte ausrollen

**Problem, das dieses Muster löst:** Bis v0.3.1 landete eine neue core-cms-Seite
(z.B. "Mein Konto", v0.3.0) nur dann in einem Kundenprojekt, wenn dort zusätzlich
*manuell* eine Route-Datei angelegt und der Sidebar-Nav-Eintrag von Hand ergänzt
wurde. Ein reiner Versions-Bump von `core-cms` allein reichte nicht — das führte
dazu, dass nach einem Update trotzdem Seiten fehlten, weil dieser zweite Schritt
schlicht vergessen wurde.

**Lösung (ab v0.4.0):** `core-cms/src/admin/core-pages.tsx` enthält eine zentrale
Liste `coreAdminPages` (Slug, Label, Icon, Komponente) sowie eine generische
`CoreAdminRoute`, die anhand des URL-Segments die passende Seite rendert. Jedes
Kundenprojekt richtet dafür **einmalig** zwei Dinge ein:

1. **Catch-all-Route-Stub** unter `src/app/admin/(dashboard)/[...core]/page.tsx`:
   ```tsx
   export { CoreAdminRoute as default } from "core-cms/src/admin";
   ```
   (Next.js bevorzugt eine exakt passende statische Route vor dem Catch-all —
   bestehende einzelne Stub-Seiten wie `konto/page.tsx` können daher entfernt werden,
   sobald der Catch-all eingerichtet ist.)
2. **Nav-Einträge dynamisch aus `coreAdminPages` rendern**, statt sie hart zu
   codieren, z.B. in `AdminLayoutClient.tsx`:
   ```tsx
   import { coreAdminPages } from "core-cms/src/admin";
   // ...
   {coreAdminPages.map((page) => (
     <Link key={page.slug} href={`/admin/${page.slug}`}>
       <page.icon size={18} /> {page.label}
     </Link>
   ))}
   ```

Danach reicht für jede **künftige** core-cms-Admin-Seite ein Eintrag in
`coreAdminPages` + ein core-cms-Versionsbump im Kundenprojekt — Route und
Nav-Eintrag erscheinen automatisch, ohne weitere Datei-Änderungen im Projekt.

**Core-Version & Changelog:** Die Seite `/admin/version` ist als Core-Admin-Seite
registriert (`coreAdminPages`) und zeigt die installierte Core-Version samt
Changelog. Beide Daten stehen in `src/admin/changelog.ts` (`CORE_VERSION`,
`CORE_CHANGELOG`) und müssen bei jedem Release vor dem Tag gepflegt werden.

## Admin-Leiste auf der öffentlichen Website (ab v0.7.0)

Angemeldete Nutzer sehen auf der öffentlichen Website eine schwebende Leiste mit Button
zum Dashboard, Ausklappmenü (Schnellzugriffe, „Abmelden“) und Schließen-Button für die
aktuelle Sitzung. Nicht angemeldet oder auf `/admin` bleibt sie unsichtbar. Einbindung
mit einer Zeile im Root-Layout (`src/app/layout.tsx`):

```tsx
import { AdminLiveBar } from "core-cms/src/admin";

// im <body>:
<AdminLiveBar />
```

Optional: `dashboardHref` (Standard `/admin`) und projektspezifische Schnellzugriffe:

```tsx
<AdminLiveBar
  links={[
    { href: "/admin/termine", label: "Termine", icon: <CalendarDays size={16} /> },
    { href: "/admin/inbox", label: "Posteingang", icon: <Inbox size={16} /> },
  ]}
/>
```

Mit `showNewSubmissions: true` an einem Eintrag (z.B. dem Posteingang) zeigt die Leiste dort
die Zahl neuer Anfragen (Status „Neu“); ein roter Punkt am Menü-Button weist darauf hin.

Die Farben kommen aus den Tailwind-Tokens des Projekts (`primary`). Die Tailwind-Quellen
müssen `node_modules/core-cms` erfassen (wie bei den übrigen Core-Komponenten).

## Bilder und Caching (ab v0.8.0)

**Was core-cms macht:**
- **Verkleinern beim Upload:** JPG, PNG und WebP werden im Browser auf höchstens 2000 px
  (längste Kante, nie hochskaliert) verkleinert und als WebP (Qualität 0.82, Transparenz
  bleibt erhalten) hochgeladen. Die EXIF-Ausrichtung wird beachtet. SVG, GIF, PDF und andere
  Dateien bleiben unverändert. Wird das Ergebnis nicht kleiner, bleibt das Original. Kann der
  Browser ein Bild nicht lesen (z. B. HEIC), wird das Original hochgeladen und ein Hinweis gezeigt.
- **Ein Jahr Cache:** Uploads bekommen `Cache-Control: 31536000`. Die Dateinamen sind eindeutig
  und werden nie überschrieben (`upsert: false`).
- **Zentrale Next.js-Konfiguration:** `withCoreCms` setzt `transpilePackages`, Bildformate,
  Breiten, Qualität, Cache-Dauer und erlaubt Supabase Storage.

**Einbindung** in der `next.config.mjs` des Projekts (nur Projektspezifisches bleibt dort):

```js
import { withCoreCms } from 'core-cms/next-config.mjs'

export default withCoreCms({
  // z. B. redirects, rewrites, allowedDevOrigins, weitere images.remotePatterns
})
```

Defaults: `qualities: [75]`, `formats: ['image/webp']`, `deviceSizes: [640, 828, 1200, 1920]`,
`imageSizes: [64, 128, 256, 384]`, `minimumCacheTTL: 31536000`. Projektwerte überschreiben sie;
nur `remotePatterns` und `transpilePackages` werden zusammengeführt.

**Verkleinern anpassen** (Standard: an, 2000 px, 0.82):

```tsx
<ImageUpload imageOptimization={{ maxDimension: 1600, quality: 0.8 }} />
<MediaLibraryModal imageOptimization={{ enabled: false }} ... />
```

**Hinweise:**
- Im Projektcode nur `quality={75}` oder gar keine `quality` verwenden, weil `images.qualities`
  nur `[75]` erlaubt. Andere Werte lehnt Next.js ab.
- Die Kosten entstehen bei Vercel pro Bildtransformation (Bild x Breite x Qualität x Format).
  Der Hobby-Plan ist nur für nicht-kommerzielle Nutzung erlaubt.
- Bestandsbilder bleiben unverändert. Sie werden erst beim erneuten Hochladen verkleinert.

## Verwaltungs-Design: WNT-Backend (ab v0.9.0)

Alle Admin-Seiten nutzen ein gemeinsames Design mit den Farben von WNT-IT (`WNT_COLORS`
in `src/ui/styles.ts`: Orange `#F18652` als Akzent, Schiefer `#0F172A`, Hintergrund `#FAFAFC`).
Das Projekt liefert nur Logo und Menüpunkte.

- **Gerüst:** `AdminShell` aus `core-cms/src/ui` (Seitenleiste „Inhalte“/„System“, Umschalter,
  Konto, Handy-Menü). Core-Seiten aus `coreAdminPages` erscheinen automatisch, `group: "content"`
  unter „Inhalte“, sonst unter „System“, mit `inMenu: false` ohne Menüpunkt. Mein Konto öffnet sich über den Benutzer unten,
  die Core-Version über die Versionsangabe darüber (mit Zahl, wenn neuere Versionen veröffentlicht sind).
- **Bausteine:** `PageHeader`, `Section`, `Card`, `Field`, `Input`, `Select`, `SwitchRow`, `Button`,
  `SaveBar`, `Badge`, `Note`, `EmptyState`, `TableCard`, `ConfirmDialog` u. a. aus `core-cms/src/ui`.
- **Schrift:** Das Projekt setzt die CSS-Variable `--font-admin` (z. B. Inter über `next/font`).
- **Bildfelder:** `ImageUpload` (ein Bild) und `GalleryField` (mehrere Bilder, erstes = Hauptbild,
  Sortieren per Ziehen oder Pfeilen, optional `name` für ein verstecktes Feld mit JSON-Liste).

## Daten-Export (ab v0.13.0)

`ExportPanel` lädt Inhalte und Medien der Website als ZIP (`daten/<tabelle>.json`, `medien/<bucket>/<pfad>`, `LIES-MICH.txt`). Es hat keinen eigenen Menüpunkt, sondern kommt als Tab in die Einstellungen-Seite des Projekts (`import { ExportPanel } from "core-cms/src/export"`):

- **Tabellen** werden aus der Schnittstellen-Beschreibung (OpenAPI, Service-Role-Schlüssel) ermittelt, neue Tabellen sind also beim nächsten Export dabei. Nie enthalten: `email_settings` und Tabellen, deren Name secret, token, credential, password oder smtp enthält (`src/export/discover.ts`).
- **Medien**: alle Buckets, rekursiv. Die Dateien werden mit kurzlebigen Adressen direkt aus dem Browser geladen und dort gezippt (Chrome/Edge schreiben direkt in die Datei, andere Browser sammeln im Arbeitsspeicher, Grenze 1,5 GB).
- Braucht `SUPABASE_SERVICE_ROLE_KEY`. Eine eigene Backup-Seite im Projekt (`.../admin/.../backup/page.tsx`) samt Menüeintrag löschen.

## Pop-up (ab v0.9.0)

Ein Bild als Hinweis beim Öffnen der Website (z. B. Aktionen, Betriebsferien), pro Besuch einmal je Bild.

1. **Datenbank:** einmal pro Projekt `sql/0.9.0_site_popup.sql` ausführen (Spalten `popup_enabled`,
   `popup_image_url`, `popup_image_alt` in `site_settings`). Ohne Migration bleibt das Pop-up aus,
   die Website läuft weiter.
2. **Verwaltung:** `/admin/popup` erscheint automatisch über `coreAdminPages` unter „System“.
3. **Website:** dort einbinden, wo es erscheinen soll (liest ohne Cookies, Seite bleibt statisch):

```tsx
import { SitePopup, getSitePopup } from "core-cms/src/popup";

const popup = await getSitePopup();
return <>{popup && <SitePopup {...popup} />} …</>;
```

Kein Cookie, nur `sessionStorage` im Browser. Für automatische Tests blendet
`sessionStorage.setItem("site-popup-gesehen", "*")` das Pop-up aus.

**Für die ganze Website (ab v0.12.0, empfohlen):** `<SitePopupHost />` einmal im Root-Layout der öffentlichen Seiten
(`import { SitePopupHost } from "core-cms/src/popup"`), dann überall und ohne Seiten-Code. Einzelne `SitePopup`-Einbindungen
auf Seiten dann entfernen, sonst erscheint es doppelt. Zeitraum, Häufigkeit, Verzögerung und Seiten stellt der Kunde unter
`/admin/popup` ein; dafür einmal `sql/0.12.0_site_popup_options.sql` ausführen (ohne sie gilt das bisherige Verhalten). „Einmal pro Tag/Woche“
speichert Bild und Zeitpunkt im `localStorage` des Besuchers (nur „pro Besuch“ nutzt `sessionStorage`). Das gilt als technisch notwendig, braucht
keine Einwilligung, sollte aber in der Datenschutzerklärung stehen, z. B.: „Zum Merken, dass ein Hinweisfenster (Pop-up) bereits angezeigt wurde, nutzen
wir den Session Storage bzw. Local Storage Ihres Browsers; gespeichert werden nur die Adresse des Hinweisbildes und der Zeitpunkt, es erfolgt keine Übermittlung.“ Bei mehreren Root-Layouts (z. B. zwei Abteilungen) in jedes öffentliche Layout.

## Rechtstexte bearbeiten (ab v0.12.0)

Datenschutzerklärung u. Ä. im Admin bearbeiten: Überschriften mit ihren Texten als aufklappbare Gruppen,
Nummern (1. / 1.1 / 1.1.1) automatisch nach der Stelle, Inhaltsverzeichnis aus den Überschriften 1 und 2,
Verweise („siehe 2.5 …“) wandern bei Änderungen mit, Hinweis auf offene Platzhalter `[● …]`.

**Datenschutz-Vorlage für alle Projekte:** Die Grundtexte der Datenschutzerklärung liefert der Core
(`src/legal/templates/datenschutz.ts`): Allgemeines, Hosting, E-Mail, Cookies, Kontaktformular und Rechte. Diese Abschnitte
sind im Editor gesperrt. Im Admin unter „Datenschutzerklärung“ trägt das Projekt Firma und Kontakt ein. „Text aus
Vorlage holen“ zeigt zuerst wortweise die Änderungen und ersetzt nur diese Abschnitte, alles andere trägt das Projekt als eigenen Abschnitt ein und das bleibt erhalten.
Bei einer neuen Vorlagenversion zeigt der Admin „Neue Vorlage verfügbar“ mit der Liste der Änderungen.
Ablauf, Regelwerk und die Übersicht, welches Projekt auf welcher Vorlagenversion steht: [docs/RECHTSTEXTE.md](docs/RECHTSTEXTE.md).

**Standard (empfohlen): alles kommt aus dem Core.**

1. **Datenbank:** einmal pro Projekt `sql/0.12.0_legal_documents.sql` ausführen (Tabelle `legal_documents`, nur die Inhalte
   sind öffentlich lesbar, keine E-Mail-Adresse des Bearbeiters). Die Datei kann gefahrlos erneut ausgeführt werden.
   Ohne Migration und ohne Vorlage im Projekt liefert die Seite „nicht gefunden“.
2. **Website:** einmalig eine Route anlegen, z. B. `app/[legal]/page.tsx` (in der Route-Gruppe mit dem passenden Layout):

```tsx
export { LegalRoute as default, generateLegalMetadata as generateMetadata, generateLegalStaticParams as generateStaticParams } from "core-cms/src/legal";
export const dynamicParams = false; // nur /datenschutz und /impressum
```

   Das Aussehen der Seiten gibt der Core vor (einheitlich, keine Optionen pro Projekt). Nur Vorlagen für die Zeit vor dem ersten Speichern kann das Projekt in einer eigenen Route-Datei mitgeben:

```tsx
import { renderLegalPage, generateLegalMetadata, generateLegalStaticParams } from "core-cms/src/legal";
export const generateMetadata = generateLegalMetadata;
export const generateStaticParams = generateLegalStaticParams;
export const dynamicParams = false;
export default function Page(props: { params: Promise<{ legal?: string | string[] }> }) {
  return renderLegalPage(props, { templates: { datenschutz: { title, version, blocks }, impressum: { anbieter: { na: false, v: { name: "…" } } } } });
}
```

3. **Admin:** „Datenschutzerklärung“ und „Impressum“ erscheinen über `coreAdminPages` (Menü und Catch-all) automatisch unter „System“. Nicht zusätzlich im Menü des Projekts eintragen, sonst stehen sie doppelt dort.
   Die Kennungen sind fest: `datenschutz` (Text) und `impressum` (Formular, eigene Spalte `data`). Das Impressum kann nicht über
   den Text-Editor gespeichert werden, damit sich beide Wege nie überschreiben.

**Alternativ: eigene Admin-Seite mit Vorlage** (eigene Route, hat Vorrang vor dem Catch-all, der Menüpunkt kommt weiter aus dem Core), z. B. `app/admin/(dashboard)/datenschutz/page.tsx`:

```tsx
import { LegalDocumentPage } from "core-cms/src/legal";
export default function Page() {
  return <LegalDocumentPage slug="datenschutz" label="Datenschutzerklärung" publicPath="/datenschutz"
    template={{ title, version, blocks }} />; // Vorlage: Liste { t: "h1"|"h2"|"h3"|"p"|"li", text, ref? }
}
```

**Website komplett selbst gestalten:** Text lesen und Verweise einsetzen, dann selbst rendern
(`groupPolicyBlocks`, `policyToc`, `policyAnchor` helfen dabei):

```tsx
import { getLegalDocument, resolvePolicyRefs } from "core-cms/src/legal";
const doc = await getLegalDocument("datenschutz", template);
const blocks = resolvePolicyRefs(doc.blocks);
```

Für schlichte Texte ohne Nummern, Inhaltsverzeichnis und Verweise `numbered={false}` und ggf. `showVersion={false}` setzen; `slug` ist frei wählbar, nur „impressum“ ist für das Impressum-Formular reserviert.

**Impressum als Formular:** Das Impressum ist kein freier Text, sondern ein festes Formular mit den Pflichtangaben nach
§ 5 DDG (je Abschnitt mit Gesetzesstelle; Abschnitte, die nicht zutreffen, als „Nicht anwendbar“ markierbar, Vorschau,
Prüfung der Pflichtfelder). Es nutzt dieselbe Tabelle (Spalte `data`). Einbindung:

```tsx
// Admin: app/admin/(dashboard)/impressum/page.tsx
import { ImpressumPage } from "core-cms/src/legal";
export default async function Page() {
  return <ImpressumPage slug="impressum" publicPath="/impressum"
    template={{ anbieter: { na: false, v: { name: "…", street: "…" } }, register: { na: true, v: {} } }} />; // Vorbelegung, Fehlendes wird leer ergänzt
}

// Website: app/impressum/page.tsx
import { getImpressum, impressumToBlocks } from "core-cms/src/legal";
const doc = await getImpressum("impressum", template);
const blocks = impressumToBlocks(doc.data); // Absätze und Überschriften, selbst rendern
```

Überschriften, auf die verwiesen wird, tragen `ref: "kennung"`; im Text steht `{{ref:kennung}}`
(im Editor über „Verweis einfügen“). Platzhalter-Format `[● …]`; ein Verweis ohne Ziel erscheint als „[● Verweis fehlt]“.

## Mehrfachbearbeitung (ab v0.10.0)

In jeder Verwaltungsliste mehrere Einträge auswählen und ein Feld für alle ändern oder sie
gemeinsam löschen. Der Core bringt Auswahl, Aktionsleiste, Eingabefelder und das abgesicherte
Speichern mit, das Projekt beschreibt pro Tabelle nur die freigegebenen Felder.

1. **Beschreibung** (nur Server, z. B. `src/lib/bulk.ts`):

```ts
import { defineBulk, defineBulkRegistry } from "core-cms/src/bulk/types";

export const BULK = defineBulkRegistry({
  products: defineBulk({
    table: "products",
    scope: { abteilung: "richardprinz" },          // gilt bei jedem Lesen und Schreiben
    label: { one: "Produkt", many: "Produkte" },
    fields: {
      brand_id: { label: "Marke", type: "select", options: { table: "brands", label: "name" }, required: true },
      price: { label: "Preis", type: "number", suffix: "€", min: 0 },
      is_active: { label: "Online", type: "boolean", trueLabel: "Online", falseLabel: "Versteckt" },
    },
    delete: true,
    revalidate: ["/"],
  }),
});
```

2. **Server Action** (eine pro Projekt):

```ts
"use server";
import { runBulk } from "core-cms/src/bulk/server";
import type { BulkRequest } from "core-cms/src/bulk/types";
import { BULK } from "@/lib/bulk";

export async function bulkAction(key: string, request: BulkRequest) {
  return runBulk(BULK, key, request);
}
```

3. **Liste:** Die Seite lädt `getBulkClientConfig(BULK, "products")` (Auswahlwerte aus der
   Datenbank, ohne Funktionen) und gibt sie an die Tabelle. Dort:
   `const selection = useBulkSelection(sichtbareIds)`, `BulkSelectAll` im Tabellenkopf,
   `BulkCheckbox` je Zeile (Umschalt-Klick wählt einen Bereich), `BulkSelectAllRow` über
   Kartenlisten und `<BulkBar config={bulk} selection={selection} action={bulkAction} />`.

**Feldtypen:** `text`, `textarea`, `url`, `email`, `tel`, `number` (Setzen, Erhöhen, Senken, um %),
`boolean`, `select`, `multiselect` (Spalte `text[]`/`jsonb`: Hinzufügen, Entfernen, Ersetzen),
`relation` (Verknüpfungstabelle, z. B. Marke ↔ Bereiche), `date`, `datetime`, `color`, `image`
und `custom` (eigene Prüfung per `validate`, eigenes Eingabefeld über `customEditors` an der `BulkBar`).
Felder ohne `required` lassen sich auch leeren. Auswahlwerte: feste Liste, Tabelle oder eigene
Ladefunktion `(supabase) => Promise<{ value, label }[]>`.

**Sicherheit:** Der Browser schickt nur Schlüssel, IDs, Feld und Wert. Tabelle, Spalten und fester
Filter kommen aus der Beschreibung. `runBulk` prüft die Anmeldung, jeden Wert nach Feldtyp und dass
alle IDs im festen Filter liegen. Danach gelten zusätzlich die RLS-Regeln der Datenbank.
Optionale Hooks: `afterUpdate` (z. B. Sortierung anpassen), `beforeDelete` (Text zurückgeben = abbrechen).

## Migrationsstand

Siehe Kommentare in den jeweiligen `src/*/index.ts`-Dateien für den Stand pro Modul.

**v0.8.0:** Medien-Upload verkleinert Bilder (WebP, 2000 px) und cached ein Jahr; zentrale
`next-config.mjs` (`withCoreCms`).

| Phase | Modul | Status |
|---|---|---|
| 0 | Repo-Grundgerüst | ✅ erledigt |
| 1 | Supabase-Client + Typen | ✅ erledigt |
| 2 | Auth (Login, Passwort vergessen/ändern, Account) | ✅ erledigt |
| 3 | Media Library + Site-Settings | ✅ erledigt |
| 4 | Submissions + E-Mail-Adapter (Resend/SMTP) | ✅ erledigt |
| 5 | Pilotprojekt migrieren (richardprinz) | ✅ erledigt |
| 6 | Restliche Projekte migrieren | ✅ alb-naturenergie (v0.8.0), veee (v0.6.0, Update offen) |
| 7 | sync-core.ps1 abschalten | ✅ erledigt (Skript und `template` entfernt, 2026-10-19) |
