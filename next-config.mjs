// Zentrale Next.js-Konfiguration für Projekte, die core-cms nutzen.
//
// Bewusst reines JavaScript (ESM) statt TypeScript: next.config wird direkt von
// Node geladen, und das Package liefert sonst nur .ts-Quellen.
//
// Verwendung in next.config.mjs des Projekts:
//
//   import { withCoreCms } from 'core-cms/next-config.mjs'
//   export default withCoreCms({ /* nur Projektspezifisches */ })

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
 * - Alles andere (redirects, rewrites, headers, dangerouslyAllowSVG …) wird
 *   unverändert durchgereicht.
 *
 * @param {NextConfig} [userConfig]
 * @returns {NextConfig}
 */
export function withCoreCms(userConfig = {}) {
  const userImages = userConfig.images ?? {}

  const patterns = []
  const seen = new Set()
  for (const pattern of [SUPABASE_PATTERN, ...(userImages.remotePatterns ?? [])]) {
    const key = patternKey(pattern)
    if (seen.has(key)) continue
    seen.add(key)
    patterns.push(pattern)
  }

  return {
    ...userConfig,
    transpilePackages: [...new Set(['core-cms', ...(userConfig.transpilePackages ?? [])])],
    images: {
      ...IMAGE_DEFAULTS,
      ...userImages,
      remotePatterns: patterns,
    },
  }
}

export default withCoreCms
