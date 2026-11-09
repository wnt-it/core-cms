// Server-Teil des Einwilligungs-Features: nimmt Entscheidungen von der Website entgegen und schreibt das Protokoll.
// Im Projekt EINMAL als Route einbinden (app/api/consent/route.ts):
//
//   import { createConsentHandler } from "core-cms/src/consent/server";
//   import { consentConfig } from "@/consent.config";
//   export const dynamic = "force-dynamic";
//   export const POST = createConsentHandler(consentConfig);
//
// Der Textstand wird hier aus der Projekt-Konfiguration berechnet, nicht aus dem, was der Browser behauptet.
// Gespeichert werden nur: Serverzeit, Aktion, Auslöser, Auswahl, Textstand (Hash), Core-Version, Seitenpfad.
// Keine IP-Adresse, kein User-Agent, keine ID.

import { createHash } from "node:crypto";
import { CORE_VERSION } from "../admin/changelog";
import { createServiceRoleClient } from "../supabase/service-role";
import { stableStringify, validateEvent } from "./logic";
import { TEXT_VERSION, TEXTS } from "./texts";
import type { ResolvedConsentConfig } from "./types";

const MAX_BODY_BYTES = 4096;

/** Was ein Besucher gesehen hat: feste Texte und Dienste mit allen Angaben. Grundlage des Hashes und des Snapshots im Protokoll. */
export function buildSnapshot(config: ResolvedConsentConfig) {
  return {
    textVersion: TEXT_VERSION,
    texte: TEXTS,
    modus: config.modus,
    datenschutzUrl: config.datenschutzUrl,
    dienste: config.dienste,
  };
}

export function snapshotHash(config: ResolvedConsentConfig): string {
  return createHash("sha256").update(stableStringify(buildSnapshot(config))).digest("hex");
}

export interface ConsentHandlerOptions {
  /** Obergrenze für Einträge pro Minute insgesamt (Schutz vor Überflutung, da es keine ID zum Zählen gibt). */
  maxPerMinute?: number;
}

function json(status: number, body: Record<string, unknown> | null) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // kein Origin-Header (z. B. alte Browser, Server-zu-Server), Inhalt wird trotzdem streng geprüft
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function createConsentHandler(config: ResolvedConsentConfig, options: ConsentHandlerOptions = {}) {
  const maxPerMinute = options.maxPerMinute ?? 120;
  const hash = snapshotHash(config);

  return async function POST(request: Request): Promise<Response> {
    if (config.modus === "aus") return json(404, { error: "Nicht eingerichtet." });
    if (!sameOrigin(request)) return json(403, { error: "Nicht erlaubt." });

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json(413, { error: "Zu groß." });
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json(400, { error: "Ungültige Anfrage." });
    }
    const parsed = validateEvent(body, config.dienste);
    if (!parsed.ok) return json(400, { error: parsed.error });

    const admin = createServiceRoleClient();
    if (!admin) return json(503, { error: "SUPABASE_SERVICE_ROLE_KEY fehlt." });

    try {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count, error: countError } = await admin
        .from("consent_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since);
      if (countError) throw countError;
      if ((count ?? 0) >= maxPerMinute) return json(429, { error: "Zu viele Anfragen." });

      const { error: snapError } = await admin
        .from("consent_configs")
        .upsert({ hash, snapshot: buildSnapshot(config) }, { onConflict: "hash", ignoreDuplicates: true });
      if (snapError) throw snapError;

      const { error } = await admin.from("consent_events").insert({
        action: parsed.value.action,
        trigger: parsed.value.trigger,
        choices: parsed.value.choices,
        config_hash: hash,
        core_version: CORE_VERSION,
        page_path: parsed.value.pagePath ?? null,
      });
      if (error) throw error;
      return json(204, null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "";
      console.error("consent: Protokoll konnte nicht geschrieben werden:", msg);
      // Tabelle fehlt: Migration nicht ausgeführt
      if (/consent_(events|configs)|schema cache|does not exist/i.test(msg)) return json(503, { error: "migration" });
      return json(500, { error: "Speichern fehlgeschlagen." });
    }
  };
}
