// Admin-Seite /admin/einwilligungen (über coreAdminPages, im Menü nur mit AdminShell optionalPages={["einwilligungen"]}).
// Zeigt, was die Website zuletzt angezeigt hat (Textstand), die Dienste samt Prüfstand und das Protokoll der Entscheidungen.
// Liest ausschließlich aus der Datenbank, braucht also keine Konfiguration aus dem Projekt.

import { Badge, Card, EmptyState, Note, PageHeader, Section } from "../ui/components";
import { cx, mutedClass } from "../ui/styles";
import { getConsentOverview } from "./admin-actions";
import ConsentAdminActions from "./ConsentAdminActions";
import type { ConsentService } from "./types";

const ACTION_LABEL = { accept_all: "Alle zugelassen", reject_all: "Alle abgelehnt", custom: "Auswahl getroffen" } as const;
const TRIGGER_LABEL = { banner: "Banner", settings: "Einstellungen", embed: "Platzhalter" } as const;

const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;

function checkAge(geprueftAm: string): { tone: "green" | "amber"; label: string } {
  const age = Date.now() - new Date(`${geprueftAm}T00:00:00Z`).getTime();
  return age > 12 * MONTH_MS ? { tone: "amber", label: `Prüfung über 12 Monate her (${geprueftAm})` } : { tone: "green", label: `Geprüft am ${geprueftAm}` };
}

const pct = (n: number, total: number) => (total === 0 ? "–" : `${Math.round((n / total) * 100)} %`);

export default async function ConsentAdminPage() {
  const overview = await getConsentOverview();

  return (
    <>
      <PageHeader
        title="Einwilligungen"
        description="Hier steht, welche externen Dienste die Website nach Zustimmung lädt und was Besucher entschieden haben. Das Protokoll enthält weder Namen noch IP-Adressen."
      />

      {!overview.ok && <Note tone={overview.migration ? "warn" : "error"}>{overview.error}</Note>}

      {overview.ok && (
        <div className="space-y-6">
          {overview.total === 0 ? (
            <Card>
              <EmptyState
                title="Noch keine Entscheidungen protokolliert"
                description="Sobald ein Besucher zustimmt oder ablehnt, erscheint hier ein Eintrag. Bleibt das nach dem Start leer, ist das Einwilligungs-Feature im Projekt nicht (richtig) eingebunden."
              />
            </Card>
          ) : (
            <Section title="Entscheidungen" description="Anteile an allen protokollierten Entscheidungen. Ein Besucher kann mehrfach auftauchen (z. B. bei Änderung). Eine Zuordnung zu Personen gibt es bewusst nicht.">
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ["Gesamt", String(overview.total)],
                  [ACTION_LABEL.accept_all, `${overview.counts.accept_all} (${pct(overview.counts.accept_all, overview.total)})`],
                  [ACTION_LABEL.reject_all, `${overview.counts.reject_all} (${pct(overview.counts.reject_all, overview.total)})`],
                  [ACTION_LABEL.custom, `${overview.counts.custom} (${pct(overview.counts.custom, overview.total)})`],
                ].map(([label, value]) => (
                  <Card key={label}>
                    <p className={mutedClass}>{label}</p>
                    <p className="mt-1 text-[20px] font-semibold text-[#0F172A]">{value}</p>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          <Section
            title="Dienste und Textstand"
            description={
              overview.latest
                ? `Zuletzt protokollierter Textstand vom ${new Date(overview.latest.created_at).toLocaleDateString("de-DE")} (Fassung der festen Texte ${overview.latest.snapshot.textVersion ?? "?"}, Modus ${overview.latest.snapshot.modus ?? "?"}).`
                : "Noch kein Textstand gespeichert. Er wird mit der ersten Entscheidung angelegt."
            }
          >
            {overview.latest?.snapshot.dienste?.length ? (
              <div className="space-y-2">
                {(overview.latest.snapshot.dienste as ConsentService[]).map((s) => {
                  const age = checkAge(s.geprueftAm);
                  return (
                    <Card key={s.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-[#0F172A]">{s.name}</p>
                        <Badge>{s.art === "einbettung" ? "Zwei-Klick am Inhalt" : "Seitenweites Skript"}</Badge>
                        {s.drittland && <Badge tone="blue">Drittland</Badge>}
                        <Badge tone={age.tone}>{age.label}</Badge>
                      </div>
                      <p className={cx(mutedClass, "mt-1")}>{s.anbieter}</p>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className={mutedClass}>Keine Dienste im letzten Textstand.</p>
            )}
          </Section>

          {overview.total > 0 && (
            <Section title="Protokoll" description={`Die letzten ${overview.events.length} Einträge, neueste zuerst. Der vollständige Verlauf steht im Export.`}>
              <ConsentAdminActions />
              <div className="mt-3 overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Zeitpunkt</th>
                      <th className="px-3 py-2 font-medium">Entscheidung</th>
                      <th className="px-3 py-2 font-medium">Über</th>
                      <th className="px-3 py-2 font-medium">Seite</th>
                      <th className="px-3 py-2 font-medium">Auswahl</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.events.map((e) => (
                      <tr key={e.id} className="border-b border-[#F1F5F9] last:border-0">
                        <td className="whitespace-nowrap px-3 py-2">{new Date(e.created_at).toLocaleString("de-DE")}</td>
                        <td className="px-3 py-2">{ACTION_LABEL[e.action]}</td>
                        <td className="px-3 py-2">{TRIGGER_LABEL[e.trigger]}</td>
                        <td className="px-3 py-2">{e.page_path ?? "–"}</td>
                        <td className="px-3 py-2">
                          {Object.entries(e.choices ?? {})
                            .map(([id, v]) => `${id}: ${v ? "an" : "aus"}`)
                            .join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </div>
      )}
    </>
  );
}
