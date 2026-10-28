// Admin-Seite: installierte Core-Version + Changelog
import { ChevronDown } from 'lucide-react'
import { CORE_CHANGELOG, CORE_VERSION, type ChangeType } from './changelog'
import { Badge, Card, Note, PageHeader, Section, mutedClass } from '../ui'

const TYPE_LABELS: Record<ChangeType, { label: string; tone: 'green' | 'blue' | 'red' | 'neutral' }> = {
  feature: { label: 'Neu', tone: 'green' },
  fix: { label: 'Fix', tone: 'blue' },
  security: { label: 'Sicherheit', tone: 'red' },
  docs: { label: 'Doku', tone: 'neutral' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Neueste veröffentlichte Core-Version von GitHub (öffentliches Repo, stündlich gecacht).
// Bei Fehlern (offline, Rate-Limit) kein Hinweis statt einer Fehlerseite.
async function getLatestCoreVersion(): Promise<string | null> {
  try {
    const res = await fetch('https://api.github.com/repos/wnt-it/core-cms/tags?per_page=30', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const tags: { name: string }[] = await res.json()
    const versions = tags.map((t) => t.name.replace(/^v/, '')).filter((v) => /^\d+\.\d+\.\d+$/.test(v))
    versions.sort((a, b) => compareVersions(b, a))
    return versions[0] ?? null
  } catch {
    return null
  }
}

function compareVersions(a: string, b: string) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

export default async function VersionPage() {
  const latest = await getLatestCoreVersion()
  const updateAvailable = latest !== null && compareVersions(latest, CORE_VERSION) > 0
  const current = CORE_CHANGELOG.find((entry) => entry.version === CORE_VERSION)

  return (
    <>
      <PageHeader title="Core-Version" description="Installierte Version des WNT-IT Core und die letzten Änderungen." />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-5 sm:px-6">
          <div className="mr-auto min-w-0">
            <p className={mutedClass}>Aktuelle Version</p>
            <p className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-[#0F172A]">v{CORE_VERSION}</p>
          </div>
          {latest !== null &&
            (updateAvailable ? (
              <Badge tone="amber" dot>Update verfügbar</Badge>
            ) : (
              <Badge tone="green" dot>Neueste Version</Badge>
            ))}
          {current && <span className={mutedClass}>Veröffentlicht am {formatDate(current.date)}</span>}
        </div>
      </Card>

      {updateAvailable && (
        <Note tone="warn">
          Eine neuere Version ist verfügbar: <strong>v{latest}</strong>. Bitte WNT-IT für das Update kontaktieren.
        </Note>
      )}

      <Section title="Changelog" description="Alle Änderungen am Core, neueste zuerst." bare>
        <Card padded={false}>
          {CORE_CHANGELOG.map((entry, index) => (
            <details key={entry.version} open={index === 0} className="group border-t border-[#F1F5F9] first:border-t-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none transition-colors hover:bg-[#FAFAFC] focus-visible:shadow-[inset_0_0_0_3px_var(--admin-ring)] sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-[#0F172A]">v{entry.version}</span>
                  <span className={mutedClass}>
                    {formatDate(entry.date)} · {entry.changes.length} {entry.changes.length === 1 ? 'Änderung' : 'Änderungen'}
                  </span>
                </span>
                <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-[#64748B] transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <ul className="flex flex-col gap-3 px-5 pb-5 sm:px-6">
                {entry.changes.map((change, i) => (
                  <li key={i} className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 text-[14px] leading-relaxed text-[#334155] sm:grid-cols-[104px_minmax(0,1fr)]">
                    <span className="pt-0.5">
                      <Badge tone={TYPE_LABELS[change.type].tone}>{TYPE_LABELS[change.type].label}</Badge>
                    </span>
                    <span>{change.text}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </Card>
      </Section>
    </>
  )
}
