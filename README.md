# core-cms

Zentrales, versioniertes CMS-Core-Package für alle WNT-IT Next.js/Supabase-Projekte
(`template`, `richardprinz`, `veee`, `alb-naturenergie`, `dago`, `wnt-it`).

Ersetzt das bisherige Datei-Kopier-Skript `scripts/sync-core.ps1`: statt Core-Dateien
1:1 in jedes Projekt zu kopieren, installiert jedes Projekt dieses Package als
versionierte Dependency (`package.json`) und importiert daraus.

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
  "core-cms": "github:wnt-it/core-cms#v0.1.0"
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
   (Pfad relativ zur CSS-Datei anpassen.) Das war die Ursache dafür, dass der Posteingang in
   richardprinz nach der Migration kaputt aussah, obwohl der Component-Code mit `veee`/`template`
   praktisch identisch war — am 2026-09-24 gefixt, siehe `richardprinz/src/index.css`.

Bei richardprinz bereits so eingerichtet (siehe dortige `tsconfig.json`/`next.config.mjs`/`src/index.css`).
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
RESEND_API_KEY=          # falls Resend als Provider gewählt wird
SMTP_HOST=                # falls eigener SMTP-Server gewünscht
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

**`SUPABASE_SERVICE_ROLE_KEY` (ab v0.3.1 Pflicht):** Wird ausschließlich serverseitig genutzt,
um SMTP-Zugangsdaten aus der Tabelle `email_settings` zu lesen (bewusst nicht über den
anon-Key, da `site_settings` öffentlich lesbar ist und SMTP-Daten dort nicht liegen dürfen —
siehe Sicherheitsfix v0.3.1). Zu finden im Supabase-Dashboard unter
**Project Settings → API → service_role secret**. Niemals mit `NEXT_PUBLIC_`-Präfix setzen,
niemals im Browser verwenden. Ohne diese Variable funktioniert weiterhin alles außer dem
automatischen SMTP-Versand über die Datenbank-Einstellungen (ENV-basiertes SMTP via
`SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` funktioniert davon unabhängig).

## Migrationsstand

Siehe Kommentare in den jeweiligen `src/*/index.ts`-Dateien für den Stand pro Modul.

| Phase | Modul | Status |
|---|---|---|
| 0 | Repo-Grundgerüst | ✅ erledigt |
| 1 | Supabase-Client + Typen | offen |
| 2 | Auth | offen |
| 3 | Media Library + Site-Settings | offen |
| 4 | Submissions + E-Mail-Adapter (Resend/SMTP) | offen |
| 5 | Pilotprojekt (richardprinz) migrieren | offen |
| 6 | Restliche Projekte + template migrieren | offen |
| 7 | sync-core.ps1 abschalten | offen |
