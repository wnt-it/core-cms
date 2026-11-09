'use client'

// Belegter Speicher der Website als kleiner Ring mit Prozentzahl (ab v0.15.1), daneben „1,2 GB von 5 GB“.
// Der Platz ist von Anfang an fest reserviert (grauer Ring beim Laden), damit sich die Mediathek beim Öffnen
// nicht verschiebt. Der letzte Stand bleibt im Speicher des Browsers, beim erneuten Öffnen erscheint er sofort
// und wird im Hintergrund aktualisiert. Ab 80 % gelb, ab 100 % rot, die Erklärung steht im Tooltip.

import { useEffect, useState } from 'react'
import { getStorageUsage } from './storage-usage'
import { storageStatus } from './storage-quota'
import { cx } from '../ui/styles'

type Usage = { usedBytes: number; quotaBytes: number | null }

// Letzter bekannter Stand für alle Anzeigen dieser Seite (sofort sichtbar beim erneuten Öffnen)
let lastUsage: Usage | null = null

const formatSize = (bytes: number) => {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb < 0.1) return `${Math.max(0, bytes / (1024 * 1024)).toLocaleString('de-DE', { maximumFractionDigits: 0 })} MB`
  return `${gb.toLocaleString('de-DE', { maximumFractionDigits: gb < 10 ? 1 : 0 })} GB`
}

const SIZE = 34
const STROKE = 3.5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface StorageUsageProps {
  /** Bei jeder Änderung neu laden, z. B. nach einem Upload oder Löschen. */
  refreshKey?: unknown
  className?: string
}

export function StorageUsage({ refreshKey, className }: StorageUsageProps) {
  const [usage, setUsage] = useState<Usage | null>(lastUsage)
  const [failed, setFailed] = useState(false)
  // Ring erst nach dem ersten Bild füllen, damit er sanft von 0 hochläuft
  const [shown, setShown] = useState(lastUsage !== null)

  useEffect(() => {
    let cancelled = false
    getStorageUsage()
      .then((res) => {
        if (cancelled) return
        if (!res.ok) return setFailed(lastUsage === null)
        lastUsage = { usedBytes: res.usedBytes, quotaBytes: res.quotaBytes }
        setUsage(lastUsage)
      })
      .catch(() => {
        if (!cancelled) setFailed(lastUsage === null)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  useEffect(() => {
    if (!usage || shown) return
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [usage, shown])

  // Ohne Ergebnis (z. B. fehlender Service-Role-Schlüssel) nichts anzeigen statt einer Fehlermeldung
  if (failed && !usage) return null

  const status = usage ? storageStatus(usage.usedBytes, usage.quotaBytes) : null
  const ratio = status?.ratio ?? null
  const state = status?.state ?? 'ok'
  const percent = ratio === null ? null : Math.round(ratio * 100)
  const fill = ratio === null || !shown ? 0 : Math.min(ratio, 1)
  const color = state === 'full' ? '#DC2626' : state === 'warn' ? '#D97706' : 'var(--admin-accent,#F18652)'

  const amount = usage ? (usage.quotaBytes ? `${formatSize(usage.usedBytes)} von ${formatSize(usage.quotaBytes)}` : `${formatSize(usage.usedBytes)} belegt`) : ''
  const hint =
    state === 'full'
      ? 'Speicher-Kontingent ausgeschöpft. Nicht mehr benötigte Dateien löschen oder uns auf mehr Speicher ansprechen.'
      : state === 'warn'
        ? 'Speicher-Kontingent fast ausgeschöpft.'
        : ''
  const title = usage ? `Speicher: ${amount}${percent !== null ? ` (${percent} %)` : ''}${hint ? `. ${hint}` : ''}` : 'Speicher wird geladen'

  return (
    <div className={cx('flex h-[34px] shrink-0 items-center gap-2.5', className)} title={title}>
      <span
        className="relative grid shrink-0 place-items-center"
        style={{ width: SIZE, height: SIZE }}
        {...(percent !== null
          ? { role: 'meter', 'aria-label': 'Belegter Speicher', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.min(percent, 100), 'aria-valuetext': title }
          : {})}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#E2E8F0" strokeWidth={STROKE} />
          {ratio !== null && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - fill)}
              className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
            />
          )}
        </svg>
        <span
          className={cx(
            'absolute text-[9.5px] font-semibold tabular-nums leading-none transition-opacity duration-300',
            usage ? 'opacity-100' : 'opacity-0',
            state === 'full' ? 'text-[#B91C1C]' : state === 'warn' ? 'text-[#B45309]' : 'text-[#334155]',
          )}
          aria-hidden="true"
        >
          {percent !== null ? `${Math.min(percent, 999)}%` : ''}
        </span>
      </span>
      <span className={cx('hidden min-w-[92px] flex-col leading-tight transition-opacity duration-300 sm:flex', usage ? 'opacity-100' : 'opacity-0')} aria-hidden="true">
        <span className="text-[11px] text-[#94A3B8]">Speicher</span>
        <span className={cx('whitespace-nowrap text-[12px] tabular-nums', state === 'full' ? 'font-medium text-[#B91C1C]' : state === 'warn' ? 'text-[#B45309]' : 'text-[#334155]')}>
          {amount || ' '}
        </span>
      </span>
    </div>
  )
}

export default StorageUsage
