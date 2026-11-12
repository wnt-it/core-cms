"use client";

// Einwilligungs-Feature: Provider mit Banner (Modus „banner“), Einstellungs-Dialog und Button „Cookie-Einstellungen“.
// Im Root-Layout der öffentlichen Seiten EINMAL einbinden und die Seite darin einwickeln:
//
//   import { ConsentProvider } from "core-cms/src/consent";
//   import { consentConfig } from "@/consent.config";
//   <body><ConsentProvider config={consentConfig}>{children}</ConsentProvider></body>
//
// Eingebettete Inhalte werden mit <ConsentGate service="google-maps"> umschlossen (Zwei-Klick-Lösung).
// Im Verwaltungsbereich (/admin) erscheint nichts.

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConsentContext, type ConsentContextValue } from "./context";
import {
  GROUP_AFTER,
  PENDING_KEY,
  STORAGE_KEY,
  actionFor,
  allChoices,
  bannerVisible,
  buildStored,
  resolveState,
  withdrawnServices,
} from "./logic";
import { cookieDomains, storageNameMatches } from "./google";
import { ServiceInfo } from "./ServiceInfo";
import { CONSENT_CSS } from "./styles";
import { TEXTS } from "./texts";
import type { ConsentChoices, ConsentEventPayload, ConsentService, ConsentTrigger, ResolvedConsentConfig } from "./types";

const KATEGORIE_LABEL = { funktional: "Funktionale Dienste", statistik: "Statistik", marketing: "Marketing und Videos" } as const;

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readPending(): ConsentEventPayload[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as ConsentEventPayload[]) : [];
  } catch {
    return [];
  }
}

function writePending(list: ConsentEventPayload[]) {
  try {
    if (list.length === 0) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-10)));
  } catch {
    /* Speicher nicht verfügbar: Ereignis geht verloren, die Auswahl selbst gilt trotzdem */
  }
}

/** Schickt ein Ereignis ans Protokoll. true = angekommen oder dauerhaft nicht zustellbar (dann nicht erneut versuchen). */
async function postEvent(endpoint: string, payload: ConsentEventPayload): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
    });
    if (res.ok) return true;
    // 4xx (außer 429) wird nie besser, 5xx und 429 später erneut versuchen
    return res.status >= 400 && res.status < 500 && res.status !== 429;
  } catch {
    return false;
  }
}

/**
 * Räumt, was ein widerrufener Dienst laut Katalog auf dem Gerät abgelegt hat (nur eigene Domain möglich).
 * Namen mit * am Ende sind Platzhalter (z. B. „_ga_*“). Cookies werden für Host, .Host und Hauptdomain gelöscht,
 * weil Skripte wie Google Analytics sie oft auf der Hauptdomain setzen.
 */
function cleanupStorage(service: ConsentService) {
  for (const s of service.speicher) {
    try {
      if (s.art === "cookie") {
        const names = document.cookie
          .split(";")
          .map((c) => c.split("=")[0].trim())
          .filter((n) => n && storageNameMatches(s.name, n));
        for (const name of names) {
          for (const domain of cookieDomains(window.location.hostname)) {
            document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
          }
        }
      } else {
        const store = s.art === "localStorage" ? localStorage : sessionStorage;
        for (const key of Object.keys(store)) if (storageNameMatches(s.name, key)) store.removeItem(key);
      }
    } catch {
      /* ignorieren */
    }
  }
}

export interface ConsentProviderProps {
  config: ResolvedConsentConfig;
  children?: ReactNode;
}

export function ConsentProvider({ config, children }: ConsentProviderProps) {
  const pathname = usePathname() ?? "/";
  const inAdmin = pathname.startsWith("/admin");
  const [ready, setReady] = useState(false);
  const [choices, setChoices] = useState<ConsentChoices>({});
  const [undecided, setUndecided] = useState<string[]>(config.dienste.map((s) => s.id));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const choicesRef = useRef<ConsentChoices>({});

  const apply = useCallback(
    (raw: string | null) => {
      const state = resolveState(raw, config.dienste, Date.now());
      choicesRef.current = state.choices;
      setChoices(state.choices);
      setUndecided(state.undecided);
    },
    [config.dienste],
  );

  // Speicher lesen (erst im Browser) und liegen gebliebene Protokoll-Ereignisse nachsenden
  useEffect(() => {
    apply(readStorage());
    setReady(true);
    const pending = readPending();
    if (pending.length > 0) {
      (async () => {
        const left: ConsentEventPayload[] = [];
        for (const p of pending) if (!(await postEvent(config.endpunkt, p))) left.push(p);
        writePending(left);
      })();
    }
    // Änderungen in einem anderen Tab übernehmen
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) apply(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [apply, config.endpunkt]);

  const commit = useCallback(
    (patch: ConsentChoices, trigger: ConsentTrigger) => {
      const previous = choicesRef.current;
      const next = { ...previous, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(buildStored(next, config.dienste, Date.now())));
      } catch {
        /* Speicher gesperrt: Auswahl gilt nur für diese Seite */
      }
      choicesRef.current = next;
      setChoices(next);
      setUndecided((u) => u.filter((id) => typeof next[id] !== "boolean"));
      setSettingsOpen(false);

      // Widerruf: Abgelegtes aufräumen, bei seitenweiten Skripten neu laden, damit sie wirklich weg sind
      let reload = false;
      for (const id of withdrawnServices(previous, next)) {
        const svc = config.dienste.find((s) => s.id === id);
        if (!svc) continue;
        cleanupStorage(svc);
        if (svc.art === "skript") reload = true;
      }

      const payload: ConsentEventPayload = {
        action: actionFor(next, config.dienste),
        trigger,
        choices: next,
        pagePath: window.location.pathname,
      };
      postEvent(config.endpunkt, payload).then((done) => {
        if (!done) writePending([...readPending(), payload]);
        if (reload) window.location.reload();
      });
    },
    [config.dienste, config.endpunkt],
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      config,
      ready,
      choices,
      undecided,
      isAllowed: (id) => ready && choices[id] === true,
      allow: (id, trigger = "embed") => commit({ [id]: true }, trigger),
      openSettings: () => setSettingsOpen(true),
    }),
    [config, ready, choices, undecided, commit],
  );

  const style = {
    "--wnt-c-accent": config.design.akzent,
    "--wnt-c-radius": `${config.design.rundung}px`,
  } as React.CSSProperties;

  const showBanner = ready && !inAdmin && bannerVisible(config.modus, undecided, pathname, config.rechtsseiten);
  const showFloat = ready && !inAdmin && config.modus !== "aus" && config.einstellungenButton === "schwebend";

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {config.modus !== "aus" && !inAdmin && (
        <div className="wnt-consent-root" style={style}>
          <style dangerouslySetInnerHTML={{ __html: CONSENT_CSS }} />
          {showBanner && <Banner config={config} undecided={undecided} onChoose={(c) => commit(c, "banner")} onSettings={() => setSettingsOpen(true)} />}
          {settingsOpen && <SettingsDialog config={config} choices={choices} onSave={(c) => commit(c, "settings")} onClose={() => setSettingsOpen(false)} />}
          {showFloat && !settingsOpen && (
            <button type="button" className="wnt-consent-float" onClick={() => setSettingsOpen(true)}>
              {TEXTS.linkEinstellungen}
            </button>
          )}
        </div>
      )}
    </ConsentContext.Provider>
  );
}

/** Die drei gleichwertigen Hauptbuttons. Gleiche Klasse, gleiche Größe, feste Reihenfolge. */
function Buttons({ onAllow, onReject, third }: { onAllow: () => void; onReject: () => void; third: { label: string; onClick: () => void } }) {
  return (
    <div className="wnt-consent-actions">
      <button type="button" className="wnt-consent-btn" onClick={onReject}>
        {TEXTS.btnAlleAblehnen}
      </button>
      <button type="button" className="wnt-consent-btn" onClick={onAllow}>
        {TEXTS.btnAlleZulassen}
      </button>
      <button type="button" className="wnt-consent-btn" onClick={third.onClick}>
        {third.label}
      </button>
    </div>
  );
}

function Links({ config }: { config: ResolvedConsentConfig }) {
  return (
    <div className="wnt-consent-links">
      <a href={config.datenschutzUrl}>{TEXTS.datenschutz}</a>
      <a href={config.impressumUrl}>{TEXTS.impressum}</a>
    </div>
  );
}

function Banner({
  config,
  undecided,
  onChoose,
  onSettings,
}: {
  config: ResolvedConsentConfig;
  undecided: string[];
  onChoose: (c: ConsentChoices) => void;
  onSettings: () => void;
}) {
  const open = config.dienste.filter((s) => undecided.includes(s.id));
  const grouped = open.length > GROUP_AFTER;
  const kategorien = (["funktional", "statistik", "marketing"] as const).filter((k) => open.some((s) => s.kategorie === k));
  const hasThirdCountry = open.some((s) => s.drittland);

  return (
    <section className="wnt-consent-banner" data-placement={config.design.platzierung} role="region" aria-labelledby="wnt-consent-h" data-testid="consent-banner">
      <h2 id="wnt-consent-h" className="wnt-consent-h">
        {TEXTS.bannerHeadline}
      </h2>
      <p className="wnt-consent-p">{TEXTS.bannerIntro}</p>
      {grouped ? (
        kategorien.map((k) => (
          <details key={k} className="wnt-consent-item">
            <summary>
              <strong>{KATEGORIE_LABEL[k]}</strong> ({open.filter((s) => s.kategorie === k).map((s) => s.name).join(", ")})
            </summary>
            {open
              .filter((s) => s.kategorie === k)
              .map((s) => (
                <div key={s.id}>
                  <strong>{s.name}</strong>
                  <ServiceInfo service={s} />
                </div>
              ))}
          </details>
        ))
      ) : (
        <ul className="wnt-consent-list">
          {open.map((s) => (
            <li key={s.id} className="wnt-consent-item">
              <strong>{s.name}</strong>
              <ServiceInfo service={s} />
            </li>
          ))}
        </ul>
      )}
      {hasThirdCountry && <p className="wnt-consent-p wnt-consent-small">{TEXTS.drittland}</p>}
      <p className="wnt-consent-p wnt-consent-small">{TEXTS.freiwillig}</p>
      <Buttons
        onAllow={() => onChoose(allChoices(open, true))}
        onReject={() => onChoose(allChoices(open, false))}
        third={{ label: TEXTS.btnEinstellungen, onClick: onSettings }}
      />
      <Links config={config} />
    </section>
  );
}

function SettingsDialog({
  config,
  choices,
  onSave,
  onClose,
}: {
  config: ResolvedConsentConfig;
  choices: ConsentChoices;
  onSave: (c: ConsentChoices) => void;
  onClose: () => void;
}) {
  // Startwert: bisherige Entscheidung, sonst „Aus“ (nichts ist vorausgewählt)
  const [draft, setDraft] = useState<ConsentChoices>(() => Object.fromEntries(config.dienste.map((s) => [s.id, choices[s.id] === true])));
  const dialogRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button, a[href]");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === dialogRef.current) {
          e.preventDefault();
          last.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wnt-consent-overlay" onClick={onClose} data-testid="consent-dialog-overlay">
      <div
        ref={dialogRef}
        className="wnt-consent-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wnt-consent-dh"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wnt-consent-dbody">
          <h2 id="wnt-consent-dh" className="wnt-consent-h">
            {TEXTS.dialogHeadline}
          </h2>
          <p className="wnt-consent-p">{TEXTS.dialogIntro}</p>
          <p className="wnt-consent-p wnt-consent-small">{TEXTS.freiwillig}</p>

          <ul className="wnt-consent-list">
            <li className="wnt-consent-item">
              <strong>{TEXTS.notwendigTitel}</strong>
              <p className="wnt-consent-small" style={{ margin: "4px 0 0" }}>
                {TEXTS.notwendigText}
              </p>
            </li>
            {config.dienste.map((s) => (
              <li key={s.id} className="wnt-consent-item">
                <div className="wnt-consent-row">
                  <div>
                    <strong>{s.name}</strong>
                    <p className="wnt-consent-small" style={{ margin: "2px 0 0" }}>
                      {s.anbieter.split(",")[0]}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft[s.id] === true}
                    aria-label={`${s.name}: ${draft[s.id] ? TEXTS.an : TEXTS.aus}`}
                    className="wnt-consent-switch"
                    onClick={() => setDraft((d) => ({ ...d, [s.id]: !d[s.id] }))}
                  >
                    <span className="wnt-consent-track" aria-hidden="true">
                      <span className="wnt-consent-thumb" />
                    </span>
                    <span className="wnt-consent-state" aria-hidden="true">
                      {draft[s.id] ? TEXTS.an : TEXTS.aus}
                    </span>
                  </button>
                </div>
                <details className="wnt-consent-details">
                  <summary>{TEXTS.gateDetails}</summary>
                  <ServiceInfo service={s} />
                </details>
              </li>
            ))}
          </ul>
        </div>

        <div className="wnt-consent-dfoot">
          <Buttons
            onAllow={() => onSave(allChoices(config.dienste, true))}
            onReject={() => onSave(allChoices(config.dienste, false))}
            third={{ label: TEXTS.btnSpeichern, onClick: () => onSave(draft) }}
          />
          <div className="wnt-consent-links">
            <a href={config.datenschutzUrl}>{TEXTS.datenschutz}</a>
            <a href={config.impressumUrl}>{TEXTS.impressum}</a>
            <button type="button" className="wnt-consent-link" onClick={onClose}>
              {TEXTS.btnSchliessen}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
