'use client'

// Zeigt den belegten Speicher der Website, mit Balken, wenn ein Kontingent gesetzt ist
// (Umgebungsvariable STORAGE_QUOTA_GB). Ab 80 % gelb, ab 100 % rot mit Hinweis.
// Wird in der Mediathek angezeigt und kann auch auf einer eigenen Medien-Seite stehen.

import { useEffect, useState } from 'react'
import { getStorageUsage } from './storage-usage'
import { storageStatus } from './storage-quota'
import { cx } from '../ui/styles'

const formatGb = (bytes: number) => {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb < 0.1) return `${Math.max(0, bytes / (1024 * 1024)).toLocaleString('de-DE', { maximumFractionDigits: 0 })} MB`
  return `${gb.toLocaleString('de-DE', { maximumFractionDigits: gb < 10 ? 1 : 0 })} GB`
}

interface StorageUsageProps {
  /** Bei jeder Änderung neu laden, z. B. nach einem Upload oder Löschen. */
  refreshKey?: unknown
  className?: string
}

export function StorageUsage({ refreshKey, className }: StorageUsageProps) {
  const [usage, setUsage] = useState<{ usedBytes: number; quotaBytes: number | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    getStorageUsage()
      .then((res) => {
        if (!cancelled && res.ok) setUsage({ usedBytes: res.usedBytes, quotaBytes: res.quotaBytes })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [refreshKey])

  // Ohne Ergebnis (z. B. fehlender Service-Role-Schlüssel) nichts anzeigen statt einer Fehlermeldung
  if (!usage) return null

  const { ratio, state } = storageStatus(usage.usedBytes, usage.quotaBytes)
  const label = usage.quotaBytes
    ? `${formatGb(usage.usedBytes)} von ${formatGb(usage.quotaBytes)} belegt`
    : `${formatGb(usage.usedBytes)} belegt`

  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
        {ratio !== null && (
          <span
            role="meter"
            aria-label="Belegter Speicher"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
            className="relative h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-[#E2E8F0]"
          >
            <span
              className={cx(
                'absolute inset-y-0 left-0 rounded-full',
                state === 'full' ? 'bg-[#DC2626]' : state === 'warn' ? 'bg-[#D97706]' : 'bg-[var(--admin-accent,#F18652)]'
              )}
              style={{ width: `${Math.min(ratio, 1) * 100}%` }}
            />
          </span>
        )}
        <span className={cx(state === 'full' && 'font-medium text-[#B91C1C]', state === 'warn' && 'text-[#B45309]')}>
          Speicher: {label}
        </span>
      </div>
      {state !== 'ok' && (
        <p className={cx('text-[12px]', state === 'full' ? 'text-[#B91C1C]' : 'text-[#B45309]')}>
          {state === 'full'
            ? 'Dein Speicher-Kontingent ist ausgeschöpft. Lösche nicht mehr benötigte Dateien oder sprich uns auf mehr Speicher an.'
            : 'Dein Speicher-Kontingent ist fast ausgeschöpft.'}
        </p>
      )}
    </div>
  )
}

export default StorageUsage
