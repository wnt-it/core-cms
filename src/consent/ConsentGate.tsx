"use client";

// Zwei-Klick-Lösung für eingebettete Inhalte (Karten, Videos, Terminbuchung).
//   <ConsentGate service="google-maps"><iframe … /></ConsentGate>
// Die Kinder werden erst gerendert, wenn der Dienst erlaubt ist. Vorher steht ein Platzhalter mit allen Pflichtangaben:
// Anbieter namentlich, Daten, Zweck, Drittland, Hinweis auf Freiwilligkeit und Widerruf. Nicht-Laden ist der Normalfall und braucht keinen Klick.
// Ohne <ConsentProvider>, bei unbekanntem Dienst oder im Modus „aus“ wird nie etwas geladen.

import type { CSSProperties, ReactNode } from "react";
import { useConsentOptional } from "./context";
import { ServiceInfo } from "./ServiceInfo";
import { CONSENT_CSS } from "./styles";
import { TEXTS } from "./texts";

export interface ConsentGateProps {
  /** Kennung des Dienstes aus der Konfiguration, z. B. "google-maps". */
  service: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function ConsentGate({ service, children, className, style }: ConsentGateProps) {
  const ctx = useConsentOptional();

  if (ctx?.isAllowed(service)) return <>{children}</>;

  const svc = ctx?.config.dienste.find((s) => s.id === service);
  const rootStyle = {
    ...style,
    "--wnt-c-accent": ctx?.config.design.akzent ?? "#1d4ed8",
    "--wnt-c-radius": `${ctx?.config.design.rundung ?? 8}px`,
  } as CSSProperties;

  // Fehlkonfiguration: nie laden, aber sichtbar machen statt still nichts zu zeigen
  if (!ctx || !svc || ctx.config.modus === "aus") {
    return (
      <div className={`wnt-consent-root wnt-consent-grow ${className ?? ""}`} style={rootStyle} data-testid="consent-gate-error">
        <style dangerouslySetInnerHTML={{ __html: CONSENT_CSS }} />
        <div className="wnt-consent-gate">
          <p className="wnt-consent-p">Dieser externe Inhalt wird nicht geladen, weil die Einwilligungsverwaltung nicht eingerichtet ist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`wnt-consent-root wnt-consent-grow ${className ?? ""}`} style={rootStyle}>
      <style dangerouslySetInnerHTML={{ __html: CONSENT_CSS }} />
      <section className="wnt-consent-gate" aria-labelledby={`wnt-gate-${service}`} data-testid="consent-gate">
        <h2 id={`wnt-gate-${service}`} className="wnt-consent-h">
          {TEXTS.gateHeadline}
        </h2>
        <p className="wnt-consent-p">
          {TEXTS.gateIntro} <strong>{svc.name}</strong> ({svc.anbieter.split(",")[0]}). {TEXTS.gateUebertragen} {svc.daten}
          {svc.drittland ? ` ${TEXTS.gateDrittlandKurz}` : ""}
        </p>
        <details className="wnt-consent-details">
          <summary>{TEXTS.gateDetails}</summary>
          <ServiceInfo service={svc} />
        </details>
        <p className="wnt-consent-p wnt-consent-small">{TEXTS.freiwillig}</p>
        <div className="wnt-consent-actions">
          <button type="button" className="wnt-consent-btn" onClick={() => ctx.allow(service, "embed")}>
            {TEXTS.btnLaden}
          </button>
        </div>
        <div className="wnt-consent-links">
          <a href={ctx.config.datenschutzUrl}>{TEXTS.datenschutz}</a>
          <button type="button" className="wnt-consent-link" onClick={ctx.openSettings}>
            {TEXTS.linkEinstellungen}
          </button>
        </div>
      </section>
    </div>
  );
}
