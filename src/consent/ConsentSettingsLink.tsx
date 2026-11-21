"use client";

// Link „Cookie-Einstellungen“ für den Footer (Widerruf und Nachlesen). Mit einstellungenButton: "footer" Pflicht,
// sonst gibt es einen kleinen schwebenden Button und der Link ist zusätzlich möglich.
//   <ConsentSettingsLink className="underline" />

import { useConsentOptional } from "./context";
import { TEXTS } from "./texts";

export function ConsentSettingsLink({ className, children }: { className?: string; children?: React.ReactNode }) {
  const ctx = useConsentOptional();
  if (!ctx || ctx.config.modus === "aus") return null;
  return (
    <button type="button" className={className} onClick={ctx.openSettings} style={className ? undefined : { background: "none", border: 0, padding: 0, font: "inherit", textDecoration: "underline", cursor: "pointer", color: "inherit" }}>
      {children ?? TEXTS.linkEinstellungen}
    </button>
  );
}
