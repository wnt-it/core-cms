// Logo der Website aus den Einstellungen (Admin → Einstellungen → Allgemein → Hauptlogo).
// Server Component. In Client-Komponenten (z. B. eine Navigationsleiste mit Scroll-Zustand) als fertiges
// Element über eine Prop hineinreichen: <Navbar logo={<SiteLogo className="h-9 w-auto" />} />.

import type { CSSProperties } from "react";
import { getSiteBranding } from "./site-branding";

export interface SiteLogoProps {
  /** Größe und Abstände (z. B. "h-9 w-auto"). Die Breite folgt dem Seitenverhältnis des Bilds. */
  className?: string;
  style?: CSSProperties;
  /** Alternativtext. Standard: Name aus den Einstellungen. */
  alt?: string;
  /** Oberhalb des sichtbaren Bereichs (Kopfzeile): sofort laden. */
  priority?: boolean;
  /** Ohne hinterlegtes Logo: Name als Text zeigen (Standard) oder nichts. */
  fallback?: "name" | "none";
  fallbackClassName?: string;
}

export default async function SiteLogo({ className, style, alt, priority, fallback = "name", fallbackClassName }: SiteLogoProps) {
  const { siteName, logoUrl } = await getSiteBranding();
  const name = alt ?? siteName ?? "";

  if (!logoUrl) {
    if (fallback === "none" || !name) return null;
    return <span className={fallbackClassName ?? "font-semibold"}>{name}</span>;
  }

  return (
    // Bewusst <img> statt next/image: Logos haben beliebige Seitenverhältnisse, SVG wäre über den
    // Bildoptimierer gesperrt, und die Mediathek liefert bereits verkleinertes WebP.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={name}
      className={className}
      style={style}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const, loading: "eager" as const } : { loading: "lazy" as const })}
    />
  );
}
