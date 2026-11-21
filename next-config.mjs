// Zentrale Next.js-Konfiguration für Projekte, die core-cms nutzen.
//
// Bewusst reines JavaScript (ESM) statt TypeScript: next.config wird direkt von
// Node geladen, und das Package liefert sonst nur .ts-Quellen.
//
// Verwendung in next.config.mjs des Projekts:
//
//   import { withCoreCms } from 'core-cms/next-config.mjs'
//   export default withCoreCms({ /* nur Projektspezifisches */ })

import fs from 'node:fs'
import path from 'node:path'

/** @typedef {import('next').NextConfig} NextConfig */

/**
 * Standard-Bildeinstellungen. Eine Qualität und wenige Breiten halten die Zahl der
 * Vercel-Bildtransformationen klein (je Bild x Breite x Qualität x Format).
 * Upload-Dateinamen sind eindeutig und unveränderlich, daher ein Jahr Cache.
 */
const IMAGE_DEFAULTS = {
  minimumCacheTTL: 31536000,
  qualities: [75],
  formats: ['image/webp'],
  deviceSizes: [640, 828, 1200, 1920],
  imageSizes: [64, 128, 256, 384],
}

/** Supabase Storage (öffentliche Buckets) ist in jedem Projekt erlaubt. */
const SUPABASE_PATTERN = {
  protocol: 'https',
  hostname: '*.supabase.co',
  pathname: '/storage/v1/object/public/**',
}

/**
 * Admin-Seiten, die es nur aus dem Core gibt (Slugs aus src/admin/core-pages.tsx). Ein Projekt darf dafür
 * keine eigene Route anlegen, sonst würde sie vor dem Catch-all gewinnen und die Core-Seite verdrängen.
 * Datenschutzerklärung und Impressum fehlen hier bewusst: dafür ist eine eigene Seite mit Vorlage erlaubt (README).
 */
export const CORE_ONLY_ADMIN_SLUGS = ['posteingang', 'einstellungen', 'popup', 'einwilligungen', 'konto', 'version']

/**
 * Frühere Adressen von Core-Seiten (wie RETIRED_ADMIN_PATHS in src/admin/core-pages.tsx). withCoreCms leitet sie
 * auf die Core-Seite um (alte Links, z. B. in E-Mails), eigene Routen dafür sind ebenfalls gesperrt.
 */
export const RETIRED_ADMIN_SLUGS = { submissions: 'posteingang' }

/** Ordner wie (dashboard) oder @modal ändern die Adresse nicht. */
function routeSegment(name) {
  return /^\(.*\)$/.test(name) || name.startsWith('@') ? null : name
}

/**
 * Sucht unter app/ bzw. src/app/ eigene Routen /admin/<slug> für Core-Seiten.
 * @param {string} [root] Projektordner (Standard: aktueller Ordner)
 * @returns {{ slug: string, file: string }[]}
 */
export function findCoreRouteConflicts(root = process.cwd()) {
  const found = []
  const walk = (dir, segments) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('_')) continue
        const seg = routeSegment(entry.name)
        walk(full, seg ? [...segments, seg] : segments)
      } else if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(entry.name)) {
        if (segments.length >= 2 && segments[0] === 'admin' && (CORE_ONLY_ADMIN_SLUGS.includes(segments[1]) || segments[1] in RETIRED_ADMIN_SLUGS)) {
          found.push({ slug: segments[1], file: path.relative(root, full) })
        }
      }
    }
  }
  for (const appDir of ['app', path.join('src', 'app')]) walk(path.join(root, appDir), [])
  return found
}

/** Bricht `next dev` und `next build` ab, wenn ein Projekt eine Core-Seite selbst anlegt. */
function assertNoCoreRouteConflicts() {
  const conflicts = findCoreRouteConflicts()
  if (conflicts.length === 0) return
  const list = conflicts.map((c) => `  - ${c.file}  (/admin/${c.slug})`).join('\n')
  throw new Error(
    `[core-cms] Diese Admin-Seiten kommen aus dem Core und dürfen im Projekt nicht selbst angelegt werden:\n${list}\n` +
      'Bitte die Dateien löschen (vorher prüfen, dass nichts verloren geht). Projektspezifisches gehört in die Optionen ' +
      'des Catch-all (CoreAdminRoute options), siehe README von core-cms, Abschnitt „Einstellungen“.',
  )
}

/** Next.js-Dateikonventionen für Favicons. Im Projekt nicht erlaubt: Das Favicon kommt aus den Einstellungen. */
const ICON_FILE = /^(favicon\.ico|(icon|apple-icon)\d*\.(ico|png|jpe?g|gif|svg|webp|tsx?|jsx?))$/i
/** Favicon-Dateien direkt in public/ (z. B. /favicon.png). */
const PUBLIC_FAVICON = /^favicon\.(ico|png|jpe?g|gif|svg|webp)$/i
/** Eigene icons-Metadaten in Layouts/Seiten (icons: …, metadata.icons = …). Nur in Dateien mit Metadaten,
 *  damit z. B. `const icons = [...]` oder eine Liste von Symbolen in Seiteninhalten nicht anschlägt. */
const ICONS_METADATA = /(\bicons\s*:\s*[[{'"`]|\bmetadata\.icons\s*=(?!=))/
const HAS_METADATA = /\b(export\s+const\s+metadata|generateMetadata|withSiteBranding)\b/
const ROUTE_FILE = /^(layout|page|template|default)\.(tsx|ts|jsx|js)$/

/**
 * Sucht Stellen, an denen ein Projekt das Favicon selbst festlegt, statt es aus den Einstellungen zu nehmen
 * (core-cms/src/branding). Gefunden werden Favicon-Dateien (app/favicon.ico, app/icon.*, app/apple-icon.*,
 * public/favicon.*) und icons-Metadaten in Layouts und Seiten.
 * @param {string} [root] Projektordner (Standard: aktueller Ordner)
 * @returns {{ file: string, reason: string }[]}
 */
export function findBrandingOverrides(root = process.cwd()) {
  const found = []
  const walk = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue
        walk(full)
      } else if (ICON_FILE.test(entry.name)) {
        found.push({ file: path.relative(root, full), reason: 'Favicon-Datei' })
      } else if (ROUTE_FILE.test(entry.name)) {
        let text = ''
        try {
          text = fs.readFileSync(full, 'utf8')
        } catch {
          continue
        }
        if (HAS_METADATA.test(text) && ICONS_METADATA.test(text)) found.push({ file: path.relative(root, full), reason: 'eigene icons-Metadaten' })
      }
    }
  }
  for (const appDir of ['app', path.join('src', 'app')]) walk(path.join(root, appDir))
  try {
    for (const name of fs.readdirSync(path.join(root, 'public'))) {
      if (PUBLIC_FAVICON.test(name)) found.push({ file: path.join('public', name), reason: 'Favicon-Datei' })
    }
  } catch {
    // kein public/-Ordner
  }
  return found
}

/** Bricht `next dev` und `next build` ab, wenn ein Projekt das Favicon selbst festlegt. */
function assertNoBrandingOverrides() {
  const overrides = findBrandingOverrides()
  if (overrides.length === 0) return
  const list = overrides.map((o) => `  - ${o.file}  (${o.reason})`).join('\n')
  throw new Error(
    `[core-cms] Favicon und Logo kommen aus den Einstellungen (Admin → Einstellungen → Allgemein), nicht aus dem Projekt:\n${list}\n` +
      'Bitte entfernen und im Root-Layout `export const generateMetadata = withSiteBranding({ … })` aus ' +
      'core-cms/src/branding verwenden, für das Logo <SiteLogo />. Siehe README von core-cms, Abschnitt „Logo und Favicon“.',
  )
}

/** Dateien mit Code, in denen das Pop-up eingebunden sein kann. */
const CODE_FILE = /\.(tsx|ts|jsx|js|mjs)$/
const POPUP_HOST = /<SitePopupHost\b/
/** Alte Einbindung einzelner Seiten (getSitePopup + <SitePopup>), ersetzt durch SitePopupHost im Layout. */
const POPUP_SINGLE = /<SitePopup(?![A-Za-z0-9_])/

/** Kommentare entfernen, damit eine auskommentierte Zeile nicht als Einbindung zählt (grob, reicht dafür). */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/**
 * Prüft, ob ein Projekt mit Admin das Pop-up auf der Website einbindet (ab v0.18.0 Pflicht): Die Einstellungen
 * unter /admin/popup gibt es in jedem Core-Projekt, also muss die Website sie auch anzeigen können.
 * Gesucht wird unter app/ und src/ außerhalb von admin-Ordnern.
 * @param {string} [root] Projektordner (Standard: aktueller Ordner)
 * @returns {{ hasAdmin: boolean, hosts: string[], singles: string[] }}
 */
export function findPopupIntegration(root = process.cwd()) {
  // Admin unter /admin, auch in Routengruppen wie app/(admin)/admin
  const hasAdminIn = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return false
    }
    return entries.some((e) => e.isDirectory() && (e.name === 'admin' || (/^\(.*\)$/.test(e.name) && hasAdminIn(path.join(dir, e.name)))))
  }
  const hasAdmin = ['app', path.join('src', 'app')].some((d) => hasAdminIn(path.join(root, d)))
  const hosts = []
  const singles = []
  const walk = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'admin' || entry.name.startsWith('.')) continue
        walk(full)
      } else if (CODE_FILE.test(entry.name)) {
        let text = ''
        try {
          text = stripComments(fs.readFileSync(full, 'utf8'))
        } catch {
          continue
        }
        if (POPUP_HOST.test(text)) hosts.push(path.relative(root, full))
        if (POPUP_SINGLE.test(text)) singles.push(path.relative(root, full))
      }
    }
  }
  walk(path.join(root, 'src'))
  walk(path.join(root, 'app'))
  return { hasAdmin, hosts: [...new Set(hosts)], singles: [...new Set(singles)] }
}

/** Bricht `next dev` und `next build` ab, wenn ein Projekt mit Admin das Pop-up nicht (oder nur alt) einbindet. */
function assertPopupIntegration() {
  const { hasAdmin, hosts, singles } = findPopupIntegration()
  if (!hasAdmin) return
  const howTo =
    'Einmal ins Layout der öffentlichen Seiten (bei mehreren öffentlichen Layouts in jedes):\n' +
    '  import { SitePopupHost } from "core-cms/src/popup";\n' +
    '  … {children}<SitePopupHost />\n' +
    'Es zeigt nur etwas an, wenn im Admin unter „Pop-up“ etwas eingeschaltet ist (Zeitraum und Seiten prüft der Core). ' +
    'Siehe README von core-cms, Abschnitt „Pop-up“.'
  if (singles.length) {
    throw new Error(
      `[core-cms] Das Pop-up ist noch einzeln auf Seiten eingebunden (<SitePopup>):\n${singles.map((f) => `  - ${f}`).join('\n')}\n` +
        'So erscheint es nur dort, die Einstellung „Auf allen Seiten“ wirkt nicht. Bitte diese Einbindung (samt getSitePopup) entfernen. ' +
        howTo,
    )
  }
  if (hosts.length === 0) {
    throw new Error(`[core-cms] Das Pop-up aus dem Admin wird auf der Website nicht angezeigt: <SitePopupHost /> fehlt.\n${howTo}`)
  }
}

/** @param {{ protocol?: string, hostname: string, port?: string, pathname?: string, search?: string }} p */
function patternKey(p) {
  return [p.protocol ?? '', p.hostname, p.port ?? '', p.pathname ?? '', p.search ?? ''].join('|')
}

/**
 * Ergänzt eine Next.js-Konfiguration um die Core-Standards.
 *
 * - transpilePackages: Vereinigung aus ['core-cms'] und den Projektwerten.
 * - images: Core-Defaults, Projektwerte überschreiben sie (auch Listen wie
 *   qualities oder deviceSizes). Nur remotePatterns werden zusammengeführt
 *   (Supabase Storage + Projekt, ohne Duplikate).
 * - Bricht ab, wenn das Projekt eine Core-Seite (CORE_ONLY_ADMIN_SLUGS) als eigene Route anlegt.
 * - redirects: alte Adressen von Core-Seiten (RETIRED_ADMIN_SLUGS) zuerst, danach die des Projekts.
 * - Bricht ab, wenn das Projekt ein eigenes Favicon festlegt (findBrandingOverrides).
 * - Bricht ab, wenn ein Projekt mit Admin das Pop-up nicht über <SitePopupHost /> einbindet (findPopupIntegration).
 * - Alles andere (redirects, rewrites, headers, dangerouslyAllowSVG …) wird
 *   unverändert durchgereicht.
 *
 * @param {NextConfig} [userConfig]
 * @returns {NextConfig}
 */
export function withCoreCms(userConfig = {}) {
  assertNoCoreRouteConflicts()
  assertNoBrandingOverrides()
  assertPopupIntegration()
  const userImages = userConfig.images ?? {}

  const patterns = []
  const seen = new Set()
  for (const pattern of [SUPABASE_PATTERN, ...(userImages.remotePatterns ?? [])]) {
    const key = patternKey(pattern)
    if (seen.has(key)) continue
    seen.add(key)
    patterns.push(pattern)
  }

  // Alte Adressen von Core-Seiten auf die neuen umleiten, vor den Umleitungen des Projekts
  const coreRedirects = Object.entries(RETIRED_ADMIN_SLUGS).flatMap(([from, to]) => [
    { source: `/admin/${from}`, destination: `/admin/${to}`, permanent: false },
    { source: `/admin/${from}/:rest*`, destination: `/admin/${to}`, permanent: false },
  ])
  const userRedirects = userConfig.redirects

  return {
    ...userConfig,
    async redirects() {
      return [...coreRedirects, ...(userRedirects ? await userRedirects() : [])]
    },
    transpilePackages: [...new Set(['core-cms', ...(userConfig.transpilePackages ?? [])])],
    images: {
      ...IMAGE_DEFAULTS,
      ...userImages,
      remotePatterns: patterns,
    },
  }
}

export default withCoreCms
