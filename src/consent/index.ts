// Einwilligungs-Feature (ab v0.14.0): Cookie-Banner und Zwei-Klick-Lösung aus dem Core.
// Das ist die ÖFFENTLICHE Schnittstelle. Nur sie unterliegt Versionsnummern, alles andere in diesem Ordner ist intern.
//
// Einrichtung im Projekt (Konzept: docs/COOKIE_BANNER_KONZEPT.md):
//  1. sql/0.14.0_consent.sql einmal in Supabase ausführen
//  2. consent.config.ts anlegen: export const consentConfig = defineConsentConfig({ dienste: [dienst("google-maps")] })
//  3. app/api/consent/route.ts: export const POST = createConsentHandler(consentConfig) (aus "core-cms/src/consent/server")
//  4. Layout: <ConsentProvider config={consentConfig}>{children}</ConsentProvider>
//  5. Einbettungen: <ConsentGate service="google-maps"><iframe /></ConsentGate>
//  6. Admin: AdminShell mit optionalPages={["einwilligungen"]}
//  7. Google (ab v0.18.0): dienst("google-analytics") / dienst("google-ads") und <GoogleTag gtmId="GTM-…" /> im Provider,
//     Conversions mit pushGoogleEvent("anfrage_gesendet"). Lädt erst nach Einwilligung, Consent Mode v2.
//
// Der Server-Teil (createConsentHandler) liegt bewusst in "core-cms/src/consent/server", damit er nicht im Browser-Bündel landet.

export { defineConsentConfig, dienst } from "./config";
export { ConsentProvider } from "./ConsentProvider";
export type { ConsentProviderProps } from "./ConsentProvider";
export { ConsentGate } from "./ConsentGate";
export type { ConsentGateProps } from "./ConsentGate";
export { ConsentSettingsLink } from "./ConsentSettingsLink";
export { useConsent } from "./context";
export { CONSENT_CATALOG } from "./catalog";
export { GoogleTag } from "./GoogleTag";
export type { GoogleTagProps } from "./GoogleTag";
export { pushGoogleEvent, googleConsentSignals } from "./google";
export type { GoogleConsentSignals, GoogleServiceIds, GoogleTagIds } from "./google";
export type {
  ConsentConfigInput,
  ConsentDesign,
  ConsentMode,
  ConsentPlacement,
  ConsentService,
  ResolvedConsentConfig,
} from "./types";
