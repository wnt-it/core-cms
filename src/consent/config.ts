// Konfiguration im Projekt:
//   export const consentConfig = defineConsentConfig({ dienste: [dienst("google-maps"), dienst("youtube")] });
// Prüft beim Laden streng, damit Fehler schon beim Start auffallen und nicht erst im Betrieb.

import { CONSENT_CATALOG } from "./catalog";
import { isServiceId, requiresConsent } from "./logic";
import type { ConsentConfigInput, ConsentMode, ConsentService, ResolvedConsentConfig } from "./types";

/** Dienst aus dem Katalog. Für einen Dienst, den es dort nicht gibt, ein vollständiges ConsentService-Objekt in `dienste` eintragen. */
export function dienst(id: string): ConsentService {
  const found = CONSENT_CATALOG[id];
  if (!found) {
    throw new Error(
      `consent: Dienst „${id}“ steht nicht im Katalog (${Object.keys(CONSENT_CATALOG).join(", ")}). ` +
        "Entweder den Dienst im Core in src/consent/catalog.ts anlegen oder ein vollständiges Objekt (ConsentService) übergeben.",
    );
  }
  return found;
}

const REQUIRED: Array<keyof ConsentService> = ["id", "art", "kategorie", "name", "anbieter", "zweck", "daten", "datenschutzUrl", "rolle", "geprueftAm"];

function validateService(s: ConsentService): void {
  for (const key of REQUIRED) {
    if (!s[key] || typeof s[key] !== "string") throw new Error(`consent: Dienst „${s.id ?? "?"}“: Pflichtfeld „${key}“ fehlt.`);
  }
  if (!isServiceId(s.id)) throw new Error(`consent: Ungültige Dienst-Kennung „${s.id}“ (Kleinbuchstaben, Ziffern, Bindestrich).`);
  if (!Number.isInteger(s.revision) || s.revision < 1) throw new Error(`consent: Dienst „${s.id}“: revision muss eine ganze Zahl ab 1 sein.`);
  if (typeof s.drittland !== "boolean") throw new Error(`consent: Dienst „${s.id}“: drittland muss true oder false sein.`);
  if (s.drittland && !s.drittlandGrundlage) throw new Error(`consent: Dienst „${s.id}“ übermittelt in ein Drittland, aber drittlandGrundlage fehlt.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.geprueftAm)) throw new Error(`consent: Dienst „${s.id}“: geprueftAm muss JJJJ-MM-TT sein.`);
  if (!/^https:\/\//.test(s.datenschutzUrl)) throw new Error(`consent: Dienst „${s.id}“: datenschutzUrl muss mit https:// beginnen.`);
  if (!Array.isArray(s.speicher)) throw new Error(`consent: Dienst „${s.id}“: speicher muss eine Liste sein (auch leer).`);
}

export function defineConsentConfig(input: ConsentConfigInput): ResolvedConsentConfig {
  const dienste = input.dienste.map((d) => (typeof d === "string" ? dienst(d) : d));
  const seen = new Set<string>();
  for (const d of dienste) {
    validateService(d);
    if (seen.has(d.id)) throw new Error(`consent: Dienst „${d.id}“ ist doppelt eingetragen.`);
    seen.add(d.id);
  }

  const hatSkript = dienste.some((d) => d.art === "skript");
  // Standard: reine Einbettungen brauchen keinen globalen Banner, Skripte schon.
  const modus: ConsentMode = input.modus ?? (hatSkript ? "banner" : requiresConsent(dienste) ? "einbettung" : "aus");

  if (modus === "banner" && !requiresConsent(dienste)) {
    throw new Error("consent: Modus „banner“ ohne einwilligungspflichtige Dienste ist nicht erlaubt (ein Banner ohne Einwilligungspflicht ist selbst fehlerhaft). Modus „aus“ verwenden.");
  }
  if (hatSkript && modus !== "banner") {
    throw new Error("consent: Dienste der Art „skript“ laden seitenweit und brauchen den Modus „banner“.");
  }
  if (modus === "aus" && requiresConsent(dienste)) {
    throw new Error("consent: Modus „aus“ mit eingetragenen Diensten ergibt keinen Sinn. Entweder Dienste entfernen oder Modus „einbettung“/„banner“ wählen.");
  }

  const datenschutzUrl = input.datenschutzUrl ?? "/datenschutz";
  const impressumUrl = input.impressumUrl ?? "/impressum";
  const rechtsseiten = input.rechtsseiten ?? [datenschutzUrl, impressumUrl];

  const akzent = input.design?.akzent ?? "#1d4ed8";
  if (!/^#[0-9a-fA-F]{3,8}$/.test(akzent)) throw new Error("consent: design.akzent muss eine Hex-Farbe sein, z. B. #1d4ed8.");

  return {
    modus,
    dienste,
    design: {
      akzent,
      rundung: Math.min(24, Math.max(0, input.design?.rundung ?? 8)),
      platzierung: input.design?.platzierung ?? "leiste-unten",
    },
    rechtsseiten,
    datenschutzUrl,
    impressumUrl,
    endpunkt: input.endpunkt ?? "/api/consent",
    einstellungenButton: input.einstellungenButton ?? "schwebend",
  };
}
