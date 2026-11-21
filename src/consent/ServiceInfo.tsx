"use client";

import { TEXTS } from "./texts";
import type { ConsentService } from "./types";

/** Pflichtangaben zu einem Dienst: Anbieter namentlich, Daten, Zweck, Drittland, Speicherung. Überall gleich (Banner, Dialog, Platzhalter). */
export function ServiceInfo({ service }: { service: ConsentService }) {
  return (
    <dl className="wnt-consent-dl">
      <dt>{TEXTS.anbieter}</dt>
      <dd>{service.anbieter}</dd>
      <dt>{TEXTS.zweck}</dt>
      <dd>{service.zweck}</dd>
      <dt>{TEXTS.daten}</dt>
      <dd>{service.daten}</dd>
      {service.drittland && (
        <>
          <dt>{TEXTS.grundlage}</dt>
          <dd>
            {service.drittlandGrundlage}. {TEXTS.drittland}
          </dd>
        </>
      )}
      {service.speicher.length > 0 && (
        <>
          <dt>{TEXTS.speicherung}</dt>
          <dd>{service.speicher.map((s) => `${s.name} (${s.art === "cookie" ? "Cookie" : s.art}, ${s.dauer})`).join(", ")}</dd>
        </>
      )}
      <dd>
        <a href={service.datenschutzUrl} target="_blank" rel="noopener noreferrer">
          {TEXTS.zurDatenschutzerklaerung}
        </a>
      </dd>
    </dl>
  );
}
