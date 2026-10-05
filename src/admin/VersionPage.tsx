// Admin-Seite: installierte Core-Version + Changelog
import { Package } from 'lucide-react'
import { CORE_CHANGELOG, CORE_VERSION, type ChangeType } from './changelog'

const TYPE_LABELS: Record<ChangeType, { label: string; className: string }> = {
  feature: { label: 'Neu', className: 'bg-emerald-50 text-emerald-700' },
  fix: { label: 'Fix', className: 'bg-amber-50 text-amber-700' },
  security: { label: 'Sicherheit', className: 'bg-red-50 text-red-700' },
  docs: { label: 'Doku', className: 'bg-neutral-100 text-neutral-600' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function VersionPage() {
  const current = CORE_CHANGELOG.find((entry) => entry.version === CORE_VERSION)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">Core-Version</h1>
        <p className="text-sm text-neutral-500 mt-1">Installierte Version des WNT-IT Core und die letzten Änderungen.</p>
      </div>

      <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 sm:p-8 flex items-center gap-4">
        <Package size={28} className="text-primary" />
        <div>
          <p className="text-xs text-neutral-500">Aktuelle Version</p>
          <p className="font-extrabold text-xl text-black">v{CORE_VERSION}</p>
          {current && <p className="text-xs text-neutral-500">Veröffentlicht am {formatDate(current.date)}</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 sm:p-8 space-y-4">
        <h2 className="font-extrabold text-xl text-black">Changelog</h2>
        {CORE_CHANGELOG.map((entry, index) => (
          <details key={entry.version} open={index === 0} className="border-t border-black/10 pt-4 first:border-t-0 first:pt-0">
            <summary className="cursor-pointer font-bold text-black">
              v{entry.version} <span className="text-xs font-normal text-neutral-500 ml-2">{formatDate(entry.date)}</span>
            </summary>
            <ul className="mt-3 space-y-2">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_LABELS[change.type].className}`}>
                    {TYPE_LABELS[change.type].label}
                  </span>
                  <span>{change.text}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  )
}
