"use client";

// Google Tag Manager bzw. gtag.js mit Consent Mode v2, nur nach Einwilligung (ab v0.18.0).
// Einmal im Root-Layout INNERHALB von <ConsentProvider> einbinden:
//
//   import { GoogleTag } from "core-cms/src/consent";
//   <ConsentProvider config={consentConfig}>
//     {children}
//     <GoogleTag gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
//   </ConsentProvider>
//
// Voraussetzung in consent.config.ts: dienst("google-analytics") und/oder dienst("google-ads") (Modus wird damit „banner“).
// Ohne ID (z. B. lokal) passiert nichts. Vor der Einwilligung wird nichts von Google geladen.
// Widerruf: Der Provider löscht die Cookies laut Katalog und lädt die Seite neu, danach ist das Skript weg.
// Conversions: pushGoogleEvent("anfrage_gesendet") (meldet nur, wenn der Tag Manager mit Einwilligung läuft).

import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useConsentOptional } from "./context";
import {
  DEFAULT_GOOGLE_SERVICES,
  anyGoogleAllowed,
  bootstrapGoogle,
  googleConfigTargets,
  googleConsentSignals,
  googleScriptUrl,
  validateGoogleIds,
  type GoogleConsentSignals,
  type GoogleServiceIds,
  type GoogleTagIds,
} from "./google";

export interface GoogleTagProps extends GoogleTagIds {
  /** Abweichende Dienst-Kennungen aus consent.config.ts (Standard: google-analytics, google-ads). */
  services?: GoogleServiceIds;
  /**
   * Personalisierte Werbung/Remarketing (ad_personalization). Standard aus: Die Katalogtexte decken nur die Conversion-Messung ab.
   * Erst einschalten, wenn Banner-Text und Datenschutzerklärung Remarketing nennen.
   */
  remarketing?: boolean;
}

type GoogleWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __wntGoogleLoaded?: boolean;
  __wntGoogleConfigured?: string[];
};

export function GoogleTag({ gtmId, gaId, adsId, services, remarketing = false }: GoogleTagProps) {
  const consent = useConsentOptional();
  const pathname = usePathname() ?? "/";
  const ids = useMemo<GoogleTagIds>(() => ({ gtmId: gtmId || undefined, gaId: gaId || undefined, adsId: adsId || undefined }), [gtmId, gaId, adsId]);
  const svc = useMemo(() => ({ ...DEFAULT_GOOGLE_SERVICES, ...services }), [services]);

  // Konfigurationsfehler früh und deutlich melden, aber nie etwas laden
  const problem = useMemo(() => {
    const idError = validateGoogleIds(ids);
    if (idError) return idError;
    if (!consent) return "GoogleTag muss innerhalb von <ConsentProvider> stehen.";
    const known = new Set(consent.config.dienste.map((d) => d.id));
    const used = [svc.analytics, svc.ads].filter(Boolean) as string[];
    if (!used.some((id) => known.has(id))) {
      return `GoogleTag: Keiner der Dienste ${used.join(", ")} steht in consent.config.ts. Ohne Eintrag gibt es keine Einwilligung, also wird nichts geladen.`;
    }
    return null;
  }, [ids, consent, svc]);

  useEffect(() => {
    if (problem && (ids.gtmId || ids.gaId || ids.adsId)) console.error(problem);
  }, [problem, ids]);

  const ready = consent?.ready ?? false;
  const choices = consent?.choices;
  const isAllowed = consent?.isAllowed;

  useEffect(() => {
    if (problem || !ready || !isAllowed) return;
    if (pathname.startsWith("/admin")) return;
    const url = googleScriptUrl(ids);
    if (!url) return;
    // Nichts erlaubt: nichts laden. (Widerruf nach dem Laden: der Provider lädt die Seite neu.)
    if (!anyGoogleAllowed(isAllowed, svc)) return;

    const w = window as GoogleWindow;
    const signals: GoogleConsentSignals = googleConsentSignals(isAllowed, svc, { remarketing });

    if (!w.__wntGoogleLoaded) {
      bootstrapGoogle(w, ids, signals);
      w.__wntGoogleConfigured = googleConfigTargets(ids, signals);
      const s = document.createElement("script");
      s.async = true;
      s.src = url;
      s.dataset.wntConsent = "google";
      document.head.appendChild(s);
      w.__wntGoogleLoaded = true;
      return;
    }

    // Schon geladen und Auswahl geändert (z. B. zusätzlich Werbung erlaubt): Google sofort informieren
    w.gtag?.("consent", "update", signals);
    const done = new Set(w.__wntGoogleConfigured ?? []);
    for (const id of googleConfigTargets(ids, signals)) {
      if (done.has(id)) continue;
      w.gtag?.("config", id);
      done.add(id);
    }
    w.__wntGoogleConfigured = [...done];
  }, [problem, ready, choices, isAllowed, pathname, ids, svc, remarketing]);

  return null;
}
