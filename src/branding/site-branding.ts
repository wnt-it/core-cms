// Logo, Favicon und Name der Website kommen ausschließlich aus den Einstellungen (site_settings, Admin →
// Einstellungen → Allgemein). Projekte binden sie nur über diesen Baustein ein und legen keine eigenen
// Favicon-Dateien oder icons-Metadaten an; withCoreCms (next-config.mjs) bricht sonst den Build ab.

import { cache } from "react";
import type { Metadata } from "next";
// Ohne Cookies lesen (site_settings ist öffentlich lesbar), damit statische Seiten statisch bleiben.
// Speichern in den Einstellungen leert den Seiten-Cache (revalidatePath("/", "layout")).
import { supabase } from "../supabase/browser-singleton";

export interface SiteBranding {
  siteName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
}

/** Liest Name, Logo und Favicon aus site_settings. Einmal pro Anfrage (React cache). */
export const getSiteBranding = cache(async (): Promise<SiteBranding> => {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("site_name, logo_url, favicon_url")
      .eq("id", "general")
      .maybeSingle();
    if (error) console.error("[getSiteBranding] site_settings query failed:", error.message);
    return {
      siteName: data?.site_name || null,
      logoUrl: data?.logo_url || null,
      faviconUrl: data?.favicon_url || null,
    };
  } catch (err) {
    console.error("[getSiteBranding] unexpected error:", err);
    return { siteName: null, logoUrl: null, faviconUrl: null };
  }
});

const ICON_TYPES: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

function iconType(url: string): string | undefined {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return ext ? ICON_TYPES[ext] : undefined;
}

/** Favicon aus den Einstellungen als Next.js-Metadaten (Browser-Tab, Lesezeichen, Apple-Homescreen). */
export async function siteIcons(): Promise<Metadata["icons"]> {
  const { faviconUrl } = await getSiteBranding();
  if (!faviconUrl) return undefined;
  const type = iconType(faviconUrl);
  return {
    icon: [{ url: faviconUrl, ...(type ? { type } : {}) }],
    shortcut: [{ url: faviconUrl }],
    apple: [{ url: faviconUrl }],
  };
}

type MetadataInput<P> = Metadata | ((props: P) => Metadata | Promise<Metadata>);

/**
 * Für das Root-Layout: ergänzt die Projekt-Metadaten um das Favicon aus den Einstellungen.
 *
 *   export const generateMetadata = withSiteBranding({ title: "…", description: "…" });
 *
 * Ein eigenes `icons` in den Projekt-Metadaten ist nicht vorgesehen und wird ignoriert.
 */
export function withSiteBranding<P = unknown>(input: MetadataInput<P> = {}) {
  return async function generateMetadata(props: P): Promise<Metadata> {
    const base = typeof input === "function" ? await input(props) : input;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { icons: _ignoriert, ...rest } = base;
    const icons = await siteIcons();
    return icons ? { ...rest, icons } : rest;
  };
}
