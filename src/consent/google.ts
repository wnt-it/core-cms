// Google Consent Mode v2: reine Logik (kein React), damit sie gut testbar ist. Oberfläche: GoogleTag.tsx.
//
// Grundsatz („Basic“ Consent Mode): Vor der Einwilligung wird KEIN Google-Skript geladen und keine Anfrage an Google geschickt.
// Erst wenn mindestens ein Google-Dienst erlaubt ist, laden Tag Manager bzw. gtag.js, und zwar mit
//   1. consent default: alles „denied“
//   2. consent update: nur die Signale der erlaubten Dienste „granted“
// So kann Google auch innerhalb des Tags nie mehr nutzen, als erlaubt ist (z. B. nur Statistik, keine Werbung).
//
// Zuordnung Dienst → Signal:
//   google-analytics → analytics_storage
//   google-ads       → ad_storage, ad_user_data (und ad_personalization nur mit remarketing: true)

export type ConsentSignal = "granted" | "denied";

export interface GoogleConsentSignals {
  ad_storage: ConsentSignal;
  ad_user_data: ConsentSignal;
  ad_personalization: ConsentSignal;
  analytics_storage: ConsentSignal;
  functionality_storage: ConsentSignal;
  personalization_storage: ConsentSignal;
  security_storage: ConsentSignal;
}

export interface GoogleServiceIds {
  /** Dienst-Kennung für Statistik (Standard: google-analytics) */
  analytics?: string;
  /** Dienst-Kennung für Werbung/Conversions (Standard: google-ads) */
  ads?: string;
}

export const DEFAULT_GOOGLE_SERVICES: Required<GoogleServiceIds> = { analytics: "google-analytics", ads: "google-ads" };

/** Ausgangslage vor jeder Entscheidung: alles verweigert. security_storage ist technisch notwendig (Betrugsabwehr) und bleibt erlaubt. */
export const DENIED_SIGNALS: GoogleConsentSignals = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  functionality_storage: "denied",
  personalization_storage: "denied",
  security_storage: "granted",
};

/** Signale aus der Auswahl je Dienst. Unbekannte oder nicht entschiedene Dienste gelten als verweigert. */
export function googleConsentSignals(
  isAllowed: (serviceId: string) => boolean,
  services: GoogleServiceIds = DEFAULT_GOOGLE_SERVICES,
  options: { remarketing?: boolean } = {},
): GoogleConsentSignals {
  const g = (ok: boolean): ConsentSignal => (ok ? "granted" : "denied");
  const analytics = !!services.analytics && isAllowed(services.analytics);
  const ads = !!services.ads && isAllowed(services.ads);
  return {
    ...DENIED_SIGNALS,
    analytics_storage: g(analytics),
    ad_storage: g(ads),
    ad_user_data: g(ads),
    // Personalisierte Werbung (Remarketing) nur, wenn das Projekt sie ausdrücklich nutzt und der Banner-Text das abdeckt
    ad_personalization: g(ads && options.remarketing === true),
  };
}

/** Soll überhaupt ein Google-Skript geladen werden? Nur wenn mindestens ein zugeordneter Dienst erlaubt ist. */
export function anyGoogleAllowed(isAllowed: (serviceId: string) => boolean, services: GoogleServiceIds = DEFAULT_GOOGLE_SERVICES): boolean {
  return (!!services.analytics && isAllowed(services.analytics)) || (!!services.ads && isAllowed(services.ads));
}

export const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/;
export const GA_ID = /^G-[A-Z0-9]{4,16}$/;
export const ADS_ID = /^AW-\d{6,14}$/;

export interface GoogleTagIds {
  /** Container des Google Tag Managers (GTM-XXXXXXX). Empfohlen: GA4, Conversion-Linker und Ads-Conversions werden dort gepflegt. */
  gtmId?: string;
  /** Ohne Tag Manager: GA4-Mess-ID (G-XXXXXXX), lädt gtag.js direkt. */
  gaId?: string;
  /** Ohne Tag Manager: Google-Ads-Konto (AW-123456789), nur zusammen mit gtag.js. */
  adsId?: string;
}

/** Prüft die IDs streng. Ein Tippfehler darf nicht dazu führen, dass irgendein anderes Skript geladen wird. */
export function validateGoogleIds(ids: GoogleTagIds): string | null {
  if (ids.gtmId && !GTM_ID.test(ids.gtmId)) return `GoogleTag: gtmId „${ids.gtmId}“ hat nicht das Format GTM-XXXXXXX.`;
  if (ids.gaId && !GA_ID.test(ids.gaId)) return `GoogleTag: gaId „${ids.gaId}“ hat nicht das Format G-XXXXXXX.`;
  if (ids.adsId && !ADS_ID.test(ids.adsId)) return `GoogleTag: adsId „${ids.adsId}“ hat nicht das Format AW-123456789.`;
  if (ids.gtmId && (ids.gaId || ids.adsId)) return "GoogleTag: entweder gtmId (Tag Manager) oder gaId/adsId (gtag.js), nicht beides. GA4 und Ads gehören dann in den Tag Manager.";
  // Keine ID: kein Fehler, GoogleTag bleibt still (z. B. lokal oder in der Vorschau ohne Variable)
  return null;
}

/** Adresse des einen Skripts, das nach der Einwilligung geladen wird. null: keine gültige ID, nichts laden. */
export function googleScriptUrl(ids: GoogleTagIds): string | null {
  if (validateGoogleIds(ids)) return null;
  if (ids.gtmId) return `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(ids.gtmId)}`;
  const first = ids.gaId ?? ids.adsId;
  return first ? `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(first)}` : null;
}

type DataLayerWindow = { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

/**
 * Legt dataLayer und gtag an und schreibt die Einwilligung in der von Google verlangten Reihenfolge (default, dann update).
 * Danach die Konfiguration für gtag.js bzw. den Start-Eintrag für den Tag Manager. Lädt selbst noch nichts.
 */
export function bootstrapGoogle(w: DataLayerWindow, ids: GoogleTagIds, signals: GoogleConsentSignals): void {
  w.dataLayer = w.dataLayer ?? [];
  if (!w.gtag) {
    // gtag erwartet das arguments-Objekt, kein Array
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
  }
  const gtag = w.gtag;
  gtag("consent", "default", { ...DENIED_SIGNALS, wait_for_update: 500 });
  // Ohne Werbe-Einwilligung keine Werbe-Kennungen in Anfragen und keine Klick-IDs in Links weiterreichen
  gtag("set", "ads_data_redaction", true);
  gtag("set", "url_passthrough", false);
  gtag("consent", "update", signals);
  if (ids.gtmId) {
    w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    return;
  }
  gtag("js", new Date());
  for (const id of googleConfigTargets(ids, signals)) gtag("config", id);
}

/**
 * gtag.js: Welche Konten werden eingerichtet? Nur die erlaubten. Sonst würde GA4 auch ohne Statistik-Einwilligung
 * cookielose Meldungen an Google schicken („Advanced“ Consent Mode), das wollen wir nicht.
 * Beim Tag Manager regelt das die Einstellung „Zusätzliche Einwilligung erforderlich“ je Tag (siehe README).
 */
export function googleConfigTargets(ids: GoogleTagIds, signals: GoogleConsentSignals): string[] {
  if (ids.gtmId) return [];
  const out: string[] = [];
  if (ids.gaId && signals.analytics_storage === "granted") out.push(ids.gaId);
  if (ids.adsId && signals.ad_storage === "granted") out.push(ids.adsId);
  return out;
}

/** Passt ein Cookie-Name zu einem Eintrag aus `speicher` (mit * am Ende als Platzhalter, z. B. „_ga_*“)? */
export function storageNameMatches(pattern: string, name: string): boolean {
  return pattern.endsWith("*") ? name.startsWith(pattern.slice(0, -1)) : name === pattern;
}

/** Domains, unter denen ein Cookie gesetzt sein kann (Host, .Host und die Hauptdomain), damit das Löschen auch wirklich greift. */
export function cookieDomains(hostname: string): string[] {
  const parts = hostname.split(".");
  const out = new Set<string>([""]);
  if (parts.length > 1 && !/^\d+$/.test(parts[parts.length - 1])) {
    out.add(hostname);
    out.add(`.${hostname}`);
    for (let i = 1; i < parts.length - 1; i++) out.add(`.${parts.slice(i).join(".")}`);
  }
  return [...out];
}

/** Meldet ein Ereignis an den Tag Manager (z. B. eine Conversion), aber nur, wenn er mit Einwilligung geladen wurde. Keine personenbezogenen Daten übergeben. */
export function pushGoogleEvent(event: string, params: Record<string, string | number | boolean> = {}): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as DataLayerWindow & { __wntGoogleLoaded?: boolean };
  if (!w.__wntGoogleLoaded || !Array.isArray(w.dataLayer)) return false;
  w.dataLayer.push({ event, ...params });
  return true;
}
