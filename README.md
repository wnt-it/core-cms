# core-cms

Zentrales, versioniertes CMS-Core-Package für WNT-IT Next.js/Supabase-Projekte.

Einzige zentrale Stelle für den Core: Projekte mit Admin/Backend installieren dieses Package
als versionierte Dependency (`package.json`) und binden die Teile per Re-Export ein.
Das frühere Datei-Kopier-Skript `scripts/sync-core.ps1` und das Repo `template` gibt es
nicht mehr (entfernt am 2026-10-19). Projekte ohne Admin/Backend brauchen keinen Core.

## Scope

**Core CMS enthält:**
- Auth (Login, Passwort vergessen, Passwort ändern; keine Registrierung, Admins werden in Supabase angelegt)
- Admin-Dashboard-Shell + Site-Settings
- Media Library + Upload
- E-Mail-Versand über SMTP aus den Einstellungen (ohne SMTP werden Anfragen nur im Posteingang gespeichert)
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

## Datenbank eines neuen Projekts (ab v0.14.0)

Neues Supabase-Projekt: einmal `sql/0.14.0_basis.sql` im SQL-Editor ausführen (Einstellungen, SMTP, Mediathek mit Bucket `images`, Posteingang, jeweils mit Rechten und Zugriffsregeln), danach die übrigen Dateien in `sql/` der Versionsreihe nach (`0.9.0_site_popup`, `0.12.0_site_popup_options`, `0.12.0_legal_documents`, bei Bedarf `0.14.0_consent`, dann `0.15.0_posteingang` und `0.16.0_haertung`). Bestehende Projekte haben diese Tabellen schon. Danach in Supabase unter Authentication die Registrierung neuer Benutzer ausschalten und den Admin-Benutzer von Hand anlegen.

## Benötigte Umgebungsvariablen im Kundenprojekt

Werden **niemals** im Admin-Backend eingetragen/gespeichert (Sicherheitsrisiko + zirkuläre
Abhängigkeit), sondern ausschließlich als Vercel-Environment-Variablen pro Projekt gesetzt:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Pflicht ab v0.3.1 - siehe unten
ENCRYPTION_KEY=          # Pflicht ab v0.7.0 - verschlüsselt das SMTP-Passwort
RESEND_API_KEY=          # falls Resend als Provider gewählt wird
STORAGE_QUOTA_GB=        # optional ab v0.14.0 - nur für Sonderfälle, sonst kommt das Kontingent automatisch
```

**Speicheranzeige (ab v0.14.0):** Die Mediathek zeigt den belegten Speicher aller Buckets, mit
Kontingent zusätzlich als Balken (Warnung ab 80 %, Hinweis ab 100 %). Das ist nur eine Anzeige,
Hochladen bleibt möglich. Das Kontingent kommt **automatisch** aus dem zentralen Kundenregister
von WNT-IT: core-cms fragt `https://www.wnt-it.com/api/kontingent` mit dem Repo-Namen und der
Produktions-Domain, die Vercel jedem Projekt selbst bereitstellt (`VERCEL_GIT_REPO_SLUG`,
`VERCEL_PROJECT_PRODUCTION_URL`; bei Vercel muss „Automatically expose System Environment Variables“
an sein, das ist Standard). Die Antwort enthält nur die Zahl und wird eine Stunde zwischengespeichert.
`STORAGE_QUOTA_GB` überschreibt das, `CORE_KONTINGENT_URL` ändert die Adresse. Ist das Register nicht
erreichbar, zeigt die Mediathek nur den belegten Speicher. Nutzt `SUPABASE_SERVICE_ROLE_KEY`; fehlt
der Schlüssel, entfällt die Anzeige.

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
    { href: "/admin/posteingang", label: "Posteingang", icon: <Inbox size={16} /> },
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

## Einstellungen (ab v0.14.0)

`/admin/einstellungen` ist eine Core-Seite (`coreAdminPages`, Gruppe „System“) und erscheint in jedem Projekt automatisch im Menü, ohne Datei und Menüeintrag im Projekt. Tabs: **Website & Branding** (`site_settings`: Name, Untertitel, Beschreibung, Logo, Favicon, Kontakt, Anschrift), **E-Mail & SMTP** (`email_settings`) und **Daten-Export** (`ExportPanel`). Die Seite lädt und speichert selbst, ein projekteigener `SiteSettingsContext` wird dafür nicht gebraucht. Tabellen wie in `sql/0.14.0_basis.sql`, keine neue SQL-Datei.

Auf der Seite stehen nur Core-Funktionen. Projektspezifisches wie Kopfbilder oder Startseiten-Inhalte ist eine eigene Projektseite unter „Inhalte“ (Menü `content`), nie ein Tab in den Einstellungen. Über Optionen im Catch-all lässt sich nur Folgendes einstellen (alles optional):

```tsx
// app/admin/(dashboard)/[...core]/page.tsx
import { CoreAdminRoute, type CoreAdminOptions } from "core-cms/src/admin";
export { generateCoreAdminMetadata as generateMetadata } from "core-cms/src/admin";

const options: CoreAdminOptions = {
  einstellungen: {
    defaultSiteName: "Muster GmbH",                       // gespeichert, wenn das Feld leer bleibt
    // dataExport: false,                                 // Tab „Daten-Export“ ausblenden
  },
};

export default function Page(props: { params: Promise<{ core?: string[] }> }) {
  return <CoreAdminRoute {...props} options={options} />;
}
```

Ohne Optionen bleibt der Catch-all wie bisher (`export { CoreAdminRoute as default, … }`).

**Umstellen eines Projekts, das die Seite bisher selbst hat:**

0. Vorher prüfen, dass nichts verloren geht: (a) SMTP-Daten liegen in `email_settings`. Projekte, die vor v0.10.0 eingerichtet wurden, haben sie eventuell noch in den Spalten `smtp_*` von `site_settings`: dann vor dem Update nach `email_settings` (id `general`) kopieren. (b) Der Standard-Seitenname des alten Wrappers (`defaultSiteName`) kommt in die Optionen. (c) Weitere Tabs oder Felder der alten Seite, die nicht aus dem Core kommen (z. B. Kopfbilder), werden eine eigene Seite unter „Inhalte“.
1. Löschen: `admin/(dashboard)/einstellungen/` komplett (`page.tsx`, `actions.ts`, ggf. `AdminSettingsClient.tsx`).
2. Löschen: die Wrapper `src/components/admin/GeneralSettingsForm.tsx` und `src/components/admin/SmtpSettingsForm.tsx`, wenn sie sonst nirgends importiert werden.
3. Den Menüpunkt `{ href: '/admin/einstellungen', … }` aus `system` in der AdminShell entfernen.
4. Nur bei Bedarf Optionen wie oben. Projekteigene Formulare, die aus der gelöschten `einstellungen/actions.ts` importieren (z. B. `updateHeroImageSetting`), ziehen mit ihrer neuen Seite unter „Inhalte“ um und bekommen dort eine eigene `"use server"`-Datei.

**Einstellungen gibt es nur einmal, aus dem Core.** Ein Projekt kann keine eigene Einstellungsseite anlegen:

- **Eigene Route:** `withCoreCms` (next.config) bricht `next dev` und `next build` mit Hinweis ab, wenn es unter `app/` bzw. `src/app/` eine Route `/admin/einstellungen` gibt (Routengruppen wie `(dashboard)` zählen nicht). Gilt für alle Core-Seiten außer Datenschutzerklärung und Impressum (`CORE_ONLY_ADMIN_SLUGS` in `next-config.mjs`).
- **Eigener Menüpunkt:** Steht im `content` oder `system` der AdminShell die Adresse einer Core-Seite, bricht die Seite in der Entwicklung mit Hinweis ab. Live wird der Punkt nur weggelassen und ein Fehler protokolliert, damit der Admin nicht ausfällt.

Die Schritte 0–3 gehören deshalb in denselben Commit wie das Update auf v0.14.0, sonst startet das Projekt nicht.

## Logo und Favicon (ab v0.14.0)

Logo, Favicon und Name der Website stehen nur in den Einstellungen (Admin → Einstellungen → Website & Branding, Bilder aus der Mediathek). Das Projekt legt sie nicht selbst fest.

```tsx
// app/layout.tsx: Favicon aus den Einstellungen, eigene icons werden ignoriert
import { withSiteBranding, SiteLogo } from "core-cms/src/branding";
export const generateMetadata = withSiteBranding({ title: "…", description: "…" });

// Logo (Server Component). In Client-Komponenten als fertiges Element über eine Prop hineinreichen:
<Navbar logo={<SiteLogo className="h-9 w-auto" priority />} />
```

- Ohne hinterlegtes Logo zeigt `<SiteLogo />` den Namen aus den Einstellungen (`fallback="none"` blendet ihn aus). Ohne Favicon gibt es keins.
- `getSiteBranding()` liefert Name, Logo und Favicon für Sonderfälle (z. B. strukturierte Daten). Gelesen wird ohne Cookies, statische Seiten bleiben statisch. Speichern in den Einstellungen erneuert die Seiten sofort.
- Login- und Passwort-Seiten nutzen dieselbe Quelle.
- **Sperre:** `withCoreCms` bricht `next dev` und `next build` ab, wenn das Projekt ein eigenes Favicon festlegt: `app/favicon.ico`, `app/icon.*`, `app/apple-icon.*`, `public/favicon.*` oder `icons:` in einem Layout oder einer Seite. Ein fest eingebautes Logo-Bild lässt sich technisch nicht sicher erkennen, dafür gilt die Regel: immer `<SiteLogo />`.

## Posteingang und Formulare (ab v0.15.0)

`/admin/posteingang` ist eine Core-Seite (ganz oben unter „System“, wie alle Core-Seiten, mit Zahl der neuen Anfragen). Die alte Adresse `/admin/submissions` leitet `withCoreCms` dorthin um, eine eigene Seite oder ein eigener Menüpunkt dafür bricht `next dev`/`next build` ab (wie bei „Einstellungen“).

**Der Core gibt keine Pflichtfelder vor.** Jedes Formular des Projekts legt mit `defineForm` fest, welche Felder es hat und welche Pflicht sind. Der Core bringt Speichern, Spam-Schutz, E-Mail-Benachrichtigung, Posteingang und Anhänge mit.

```ts
// src/forms.ts (Projekt)
import { defineForm } from "core-cms/src/submissions";

export const bewerbung = defineForm({
  type: "Bewerbung",                                   // Formular-Art im Posteingang
  fields: {
    name: { label: "Name", required: true },           // name, email, phone, company, subject, message: eigene Spalten
    email: { label: "E-Mail", required: true },        // kind "email" automatisch, Format wird geprüft
    stelle: { label: "Stelle", required: true },       // alles andere: metadata, mit Bezeichnung im Posteingang
    eintritt: { label: "Frühester Eintritt" },
    message: { label: "Anschreiben" },                 // kind "long" automatisch (5000 Zeichen)
  },
  subjectField: "stelle",                              // optional: Betreff im Posteingang
  attachments: { types: ["pdf"], maxSizeMb: 10, maxFiles: 3 }, // optional, ohne: keine Anhänge
  notify: { siteName: "Muster GmbH", brandColor: "#102d42" },   // optional, false: keine E-Mail
});
```

```ts
// src/app/actions/bewerbung.ts (Projekt)
"use server";
import { receiveSubmission } from "core-cms/src/submissions/server";
import { bewerbung } from "@/forms";

export async function sendeBewerbung(data: Record<string, unknown>) {
  return receiveSubmission(bewerbung, data);
}
```

```tsx
// Formular (Client-Komponente im Projekt)
import { FormGuard, sendForm } from "core-cms/src/submissions/client";

<form onSubmit={async (e) => {
  e.preventDefault();
  const result = await sendForm(sendeBewerbung, e.currentTarget);
  // result.success, result.error, result.field, result.rejectedFiles
}}>
  <FormGuard />
  <input name="name" /> <input name="email" type="email" /> <input name="stelle" />
  <textarea name="message" />
  <input type="file" name="unterlagen" accept=".pdf" multiple />
</form>
```

- **Felder:** Nur Felder aus `fields` werden gespeichert, alles andere ignoriert. Mehrfachauswahl (Checkboxen mit gleichem Namen) wird mit Komma verbunden. Höchstlängen: text 200, long 5000, email 254, phone 40, je Feld mit `maxLength` änderbar. Mehr als 5 Links in einem Feld werden abgelehnt.
- **Spam-Schutz:** `<FormGuard />` gehört in jedes Formular (verstecktes Feld, Zeitmessung, Herkunftsseite). Bots bekommen eine Erfolgsmeldung, ohne dass etwas gespeichert wird. Dazu höchstens 5 Anfragen je Adresse in 10 Minuten. Die Vercel-Firewall bleibt die Hauptsperre.
- **Speichern** nur über den Server (Service-Role-Schlüssel). Besucher können Anfragen weder lesen noch direkt eintragen, lesen dürfen nur angemeldete Admins (`sql/0.15.0_posteingang.sql`).
- **Anhänge:** `sendForm` schickt die Dateien nicht über den Server der Website (Vercel nimmt nur ca. 4,5 MB pro Anfrage), sondern nach der Prüfung über einmalige Upload-Adressen direkt in den privaten Speicherbereich `anfragen`. Danach prüft der Core Größe und echten Dateityp am Inhalt, was nicht passt, wird gelöscht und in `rejectedFiles` gemeldet. Erlaubt sind nur PDF, JPG und PNG. Im Posteingang lädt der Admin Anhänge nach einem Warnhinweis als Datei herunter (Link gilt eine Minute), angezeigt werden sie nie im Browser. Es gibt keinen Virenscanner. Löschen der Anfrage löscht die Anhänge mit. Anhänge zählen zum Speicher-Kontingent und sind im Daten-Export enthalten.
- **Ohne JavaScript-Helfer:** `receiveSubmission(form, formData)` nimmt auch `FormData` oder ein Objekt aus einem Route Handler, dann ohne Anhänge.
- **Bestehende Aufrufe** von `submitContactForm` laufen weiter, ohne Pflichtfelder (eine angegebene E-Mail muss gültig sein). Ab v0.16.0 mit Grund-Spam-Schutz: Längengrenzen, höchstens 5 Links, 5 Anfragen je Adresse in 10 Minuten und die Prüfung von `<FormGuard />`, wenn dessen Felder (`website`, `form_age`) im Payload stehen. Feldbezeichnungen und Anhänge gibt es nur mit `receiveSubmission`.

**Umstellen eines Projekts:**

1. `SUPABASE_SERVICE_ROLE_KEY` in Vercel prüfen, Projekt auf v0.15.0 oder neuer heben und live bringen. **Erst danach** `sql/0.15.0_posteingang.sql` im Supabase-Projekt ausführen: Die Datei entzieht Besuchern das direkte Eintragen, eine Website mit älterem Core bekäme sonst keine Anfragen mehr. Bis dahin speichert v0.15.0 schon, nur Formulare mit eigenen Feldern ohne Name/E-Mail und Anhänge brauchen die Datei.
2. Löschen: die eigene Posteingang-Seite `admin/(dashboard)/submissions/` und den Menüpunkt `/admin/submissions` in `content` bzw. `system`, dazu die Zählung neuer Anfragen fürs Menü (`newSubmissions`), das macht jetzt die AdminShell. Links auf `/admin/submissions` (Dashboard, AdminLiveBar) auf `/admin/posteingang` ändern, die Umleitung fängt vergessene ab.
3. Eigenen Spam-Schutz in Kontakt-Routen bzw. Server Actions durch `defineForm` + `receiveSubmission` ersetzen, im Formular `<FormGuard />` statt eigener Felder `website`/`form_age`. Projektspezifische Kennzeichnung (z. B. Abteilung) über `receiveSubmission(form, data, { metadata: { … }, type: "Kontakt · Abteilung" })` (der Filter im Posteingang gruppiert nach dem Teil vor „ · “).

## Absicherung und Aufräumen (ab v0.16.0)

**Beim Update eines Projekts:**

1. `sql/0.16.0_haertung.sql` im Supabase-Projekt ausführen (vor oder nach dem Update, beides geht). Die Datei gibt dem Server-Zugang Leserechte auf die Rechtstexte (Daten-Export), verhindert Ordner-Kreise in der Mediathek, pflegt `updated_at` automatisch und legt `core_storage_usage()` für die Speicheranzeige an. Außerdem kommen Indizes für Posteingang und Einwilligungen dazu, und die Dateiliste des Buckets `images` ist nur noch für Admins sichtbar (die Dateien selbst bleiben öffentlich abrufbar).
2. Empfohlen: `NEXT_PUBLIC_SITE_URL` (z. B. `https://www.example.org`) in Vercel setzen. Links in Passwort-E-Mails nutzen dann immer diese Adresse. Ohne die Variable gilt: der Host der Anfrage, wenn er zum Deployment gehört, sonst die Produktions-Domain von Vercel.
3. Optional, aber empfohlen: Fehler- und Ladeseite für den Admin. Die Dateien im Projekt bestehen nur aus einem Re-Export:
   - `app/admin/(dashboard)/error.tsx`: `export { default } from "core-cms/src/admin/AdminError";`
   - `app/admin/(dashboard)/loading.tsx`: `export { default } from "core-cms/src/admin/AdminLoading";`
4. Prüfen, dass in Supabase unter Authentication die Registrierung neuer Benutzer und anonyme Anmeldungen aus sind. Jeder angemeldete Benutzer ist Admin.

**Was sich für Entwickler ändert:**

- **Server-Module** (`supabase/service-role`, `email/smtp-settings`, `submissions/save`, `receive`, `cleanup`, `export/discover`) enthalten `import "server-only"`. Ein Import aus einer Client-Komponente bricht den Build mit klarer Meldung ab.
- **AdminShell** lädt keine Server-Seiten und keinen Changelog mehr. Das Menü kommt aus `src/admin/core-nav.ts`, die installierte Version aus `src/admin/core-version.ts` (setzt `npm run release`). Eine neue Core-Seite braucht einen Eintrag in `core-nav.ts` und ihre Komponente in `core-pages.tsx`.
- **SMTP:** `getSmtpSettings()` liefert das Passwort nicht mehr, sondern `passStatus` (`none`, `saved`, `unreadable`) und `missing`. Ein leer gelassenes Passwortfeld behält das gespeicherte. Test-E-Mail und Benachrichtigung prüfen gleich (`email/smtp-settings.ts`), beide gehen an den „Empfänger für Anfragen“.
- **`saveGeneralSettings`** speichert nur die Felder aus `GENERAL_SETTINGS_FIELDS` (`src/admin/general-settings.ts`). **`updateHeroImageSetting`** lehnt Kern-Spalten ab (`id`, Name, Logo, `popup_*` …).
- **`submitContactForm`** hat Grund-Spam-Schutz (siehe Posteingang). `receiveSubmission` zählt die Begrenzung je Adresse erst nach der Feldprüfung.
- **Mediathek:** `useMediaLibrary({ enabled })` lädt nur, solange das Fenster offen ist. `MoveModal` nimmt `excludeFolderIds`, `bucket` ist überflüssig. Typen `MediaItem`, `MediaFileItem`, `MediaFolderItem` in `src/media/folder-tree.ts`. `formatBytes` liegt in `src/ui/format.ts` (deutsch, „1,5 MB“), der Export aus `core-cms/src/media` bleibt.
- **Posteingang** lädt 100 Anfragen, ältere per „Ältere laden“. Nie fertig hochgeladene Anhänge (älter als 3 Stunden) räumt der Core beim Öffnen des Posteingangs und nach neuen Anfragen weg.
- **Einwilligungen:** zusätzlich höchstens 30 Einträge je Absender in 10 Minuten (`createConsentHandler(config, { maxPerSender })`), gezählt nur im Arbeitsspeicher.
- **Favicon-Sperre** in `withCoreCms` meldet `icons:` nur noch in Dateien mit Metadaten (`export const metadata`, `generateMetadata`, `withSiteBranding`).

## Daten-Export (ab v0.13.0)

`ExportPanel` lädt Inhalte und Medien der Website als ZIP (`daten/<tabelle>.json`, `medien/<bucket>/<pfad>`, `LIES-MICH.txt`). Ab v0.14.0 ist es ein Tab der Core-Seite „Einstellungen“ (siehe oben); einzeln einbinden geht weiter (`import { ExportPanel } from "core-cms/src/export"`):

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

## Einwilligungen: Cookie-Banner und Zwei-Klick-Lösung (ab v0.14.0)

Ein Feature für alle Projekte: Eingebettete Inhalte (Karten, Videos, Terminbuchung) laden erst nach Zustimmung, optional mit globalem
Banner. Texte, Gestaltung und Verhalten gibt der Core fest vor (gleichwertige Buttons, Pflichtangaben, Widerruf). Das Projekt trägt nur die
Dienste ein. Konzept, Begründung und Rechtsgrundlagen: [docs/COOKIE_BANNER_KONZEPT.md](docs/COOKIE_BANNER_KONZEPT.md),
Maßstab: [docs/REFERENZ_LFDI_BW_COOKIES_TRACKING.md](docs/REFERENZ_LFDI_BW_COOKIES_TRACKING.md).

**Einrichtung im Projekt (6 Handgriffe):**

1. **Datenbank:** `sql/0.14.0_consent.sql` einmal im Supabase-SQL-Editor ausführen (Tabellen `consent_configs`, `consent_events`).
   Braucht `SUPABASE_SERVICE_ROLE_KEY` (wie die E-Mail-Einstellungen).
2. **Konfiguration** `consent.config.ts` (Dienste aus dem Katalog `src/consent/catalog.ts`, sonst vollständiges `ConsentService`-Objekt):

```ts
import { defineConsentConfig, dienst } from "core-cms/src/consent";

export const consentConfig = defineConsentConfig({
  dienste: [dienst("google-maps"), dienst("youtube")],
  design: { akzent: "#1f6f3f", platzierung: "leiste-unten" }, // nur Farbe, Rundung, Platzierung
});
```

3. **Protokoll-Route** `app/api/consent/route.ts`:

```ts
import { createConsentHandler } from "core-cms/src/consent/server";
import { consentConfig } from "@/consent.config";
export const dynamic = "force-dynamic";
export const POST = createConsentHandler(consentConfig);
```

4. **Layout** (öffentliche Seiten): `<ConsentProvider config={consentConfig}>{children}</ConsentProvider>`
5. **Einbettungen** umschließen: `<ConsentGate service="google-maps"><iframe … /></ConsentGate>` (ersetzt eigene `ConsentEmbed`-Komponenten).
   Footer-Link optional: `<ConsentSettingsLink />` (bei `einstellungenButton: "footer"` Pflicht).
6. **Admin:** `<AdminShell optionalPages={["einwilligungen"]} …>`, dann erscheint „Einwilligungen“ unter „System“ (Protokoll, CSV-Export, Prüfstand der Dienste).

**Dienst-Katalog (aktuell):** `google-maps`, `youtube`, `microsoft-bookings` (je Zwei-Klick-Einbettung, mit Anbieter, Zweck, Daten, Drittland-Grundlage und Prüfdatum).
Der Katalog steht nur im Code (`src/consent/catalog.ts`), nicht im Admin: Welche Dienste ein Projekt nutzt, legt WNT-IT in `consent.config.ts` fest.
Im Admin „Einwilligungen“ erscheinen nur die Dienste, die das Projekt tatsächlich eingetragen hat. Neuer Dienst oder geänderte Angaben (Anbieter, Daten, Drittland):
im Katalog ergänzen bzw. `revision` und `geprueftAm` erhöhen, neuen Core-Tag veröffentlichen. Besucher werden dann nur zu diesem Dienst erneut gefragt.

**Modus** (`modus`, automatisch gewählt): `einbettung` = nur Zwei-Klick am Inhalt, kein globaler Banner (Standard bei reinen Einbettungen);
`banner` = globaler Banner (nötig bei seitenweiten Skripten); `aus` = keine einwilligungspflichtigen Dienste. Der Core verweigert einen
Banner ohne einwilligungspflichtigen Dienst. Auf `/datenschutz` und `/impressum` und im Admin erscheint nie ein Banner.

**Datenschutz:** Im Browser liegt nur Ja/Nein je Dienst mit Ablaufdatum (12 Monate, `localStorage` „cms_consent“), keine ID. Das Protokoll
(Serverzeit, Auswahl, Textstand, Seitenpfad) enthält weder IP-Adresse noch Kennung und lässt sich keiner Person zuordnen. Es belegt das Verfahren
und den Wortlaut je Fassung. Aufbewahrung: laufendes Jahr plus 3 Jahre (`consent_cleanup()`, im Admin auslösbar). Die Datenschutz-Vorlage
(v. 2026-11-06) beschreibt das; erst übernehmen, wenn das Projekt auf dem neuen Banner läuft.

**Prüfen:**

```bash
npm test                                                   # Logik, Server-Endpunkt, Oberfläche, Vorlage
npm run consent:check -- https://projekt.example --out=bericht.json   # Browser-Prüfung gegen eine laufende Seite
```

`consent:check` startet einen frischen Browser und prüft: keine Fremdanfragen und kein unnötiger Speicher vor der Entscheidung und nach „Alle ablehnen“,
gleich gestaltete Buttons, Überschrift nicht auf der Liste der FAQ, kein Banner auf den Rechtsseiten. Bei jedem Heben der Core-Version je Projekt
ausführen und den Bericht beim Release ablegen. Braucht Playwright mit Browser (`npx playwright install chromium` oder `--channel=msedge`/`chrome`).

**Neuen Dienst aufnehmen:** Erst die Vorprüfung (Konzept, Abschnitt 3a: Geht es ohne Dritten? Alternative? Drittland-Grundlage? AV-Vertrag?), dann ein Eintrag in
`src/consent/catalog.ts` mit allen Pflichtfeldern. `revision` nur bei wesentlichen Änderungen erhöhen (löst eine neue Frage aus). Texte in `src/consent/texts.ts`
sind rechtlich relevant: `TEXT_VERSION` erhöhen, juristisch gegenlesen, Release.

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
