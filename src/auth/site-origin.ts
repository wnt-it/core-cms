// Adresse der Website für Links in E-Mails (Passwort zurücksetzen, E-Mail ändern).
// Nicht blind aus dem Host-Header: Der kommt vom Aufrufer. Je nach Supabase-Einstellung (Redirect URLs mit
// Platzhaltern) könnte ein Reset-Link sonst auf eine fremde Adresse zeigen.
//
// Reihenfolge: NEXT_PUBLIC_SITE_URL bzw. SITE_URL, falls gesetzt. Sonst der Host der Anfrage, wenn er zu diesem
// Deployment gehört (localhost, die Vercel-Adressen und die Produktions-Domain). Sonst die Produktions-Domain.

type Env = Record<string, string | undefined>;

function normalize(url: string): string | null {
  try {
    const u = new URL(/^https?:\/\//.test(url) ? url : `https://${url}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}

export function resolveSiteOrigin(host: string | null, proto: string | null, env: Env = process.env): string {
  const configured = env.NEXT_PUBLIC_SITE_URL || env.SITE_URL;
  if (configured) {
    const origin = normalize(configured);
    if (origin) return origin;
  }

  const h = (host ?? "").trim().toLowerCase();
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(h);
  if (local) return `${proto === "https" ? "https" : "http"}://${h}`;

  const known = [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.toLowerCase());
  if (h && known.includes(h)) return `https://${h}`;

  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  // Nicht auf Vercel und nichts eingestellt (eigener Server): wie bisher der Host der Anfrage
  if (/^[a-z0-9.-]+(:\d+)?$/.test(h)) return `${proto === "http" ? "http" : "https"}://${h}`;
  return "http://localhost:3000";
}
