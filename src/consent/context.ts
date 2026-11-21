"use client";

import { createContext, useContext } from "react";
import type { ConsentChoices, ConsentTrigger, ResolvedConsentConfig } from "./types";

export interface ConsentContextValue {
  config: ResolvedConsentConfig;
  /** false, bis der Browserspeicher gelesen wurde. Bis dahin gilt alles als nicht erlaubt. */
  ready: boolean;
  choices: ConsentChoices;
  /** Dienste, über die noch nicht entschieden wurde. */
  undecided: string[];
  /** Ist der Dienst erlaubt? Vor dem Lesen des Speichers und ohne Entscheidung immer false. */
  isAllowed: (serviceId: string) => boolean;
  /** Einen einzelnen Dienst erlauben (Klick am Platzhalter). */
  allow: (serviceId: string, trigger?: ConsentTrigger) => void;
  openSettings: () => void;
}

export const ConsentContext = createContext<ConsentContextValue | null>(null);

/** Zugriff auf den Stand der Einwilligungen. Nur innerhalb von <ConsentProvider>. */
export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent muss innerhalb von <ConsentProvider> verwendet werden.");
  return ctx;
}

/** Wie useConsent, gibt aber null zurück, wenn kein Provider da ist (dann gilt alles als nicht erlaubt). */
export function useConsentOptional(): ConsentContextValue | null {
  return useContext(ConsentContext);
}
