'use client'

// Liste der Anfragen im Posteingang: ab großem Bildschirm als Tabelle, darunter als einfache Liste.

import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Submission } from '../supabase/types'
import { Trash2, ChevronDown, Paperclip } from 'lucide-react'
import { cx, iconButtonDangerClass, tableClass, tdClass, thClass, trClass } from '../ui/styles'
import { Badge, Menu } from '../ui/components'
import { STATUS_OPTIONS, formatDate, senderOf, statusOf, type StatusValue } from './submission-view'

interface SubmissionsListProps {
  submissions: Submission[]
  activeId: string | null
  hasAttachment: (id: string) => boolean
  onOpen: (sub: Submission) => void
  onStatusChange: (id: string, status: StatusValue) => void
  onDelete: (id: string, name: string) => void
}

export default function SubmissionsList({ submissions, activeId, hasAttachment, onOpen, onStatusChange, onDelete }: SubmissionsListProps) {
  // Zeile per Tastatur öffnen
  const onRowKeyDown = (e: ReactKeyboardEvent, sub: Submission) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(sub)
    }
  }

  return (
    <>
      {/* Ab großem Bildschirm: Tabelle */}
      <table className={cx(tableClass, 'hidden xl:table')}>
        <thead>
          <tr>
            <th scope="col" className={thClass}>Absender</th>
            <th scope="col" className={thClass}>Anliegen</th>
            <th scope="col" className={thClass}>Formular</th>
            <th scope="col" className={thClass}>Eingang</th>
            <th scope="col" className={thClass}>Status</th>
            <th scope="col" className={cx(thClass, 'w-12')}><span className="sr-only">Aktionen</span></th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => {
            const st = statusOf(sub.status)
            return (
              <tr
                key={sub.id}
                tabIndex={0}
                onClick={() => onOpen(sub)}
                onKeyDown={(e) => onRowKeyDown(e, sub)}
                className={cx(trClass, 'cursor-pointer outline-none focus-visible:bg-[#F1F5F9]', activeId === sub.id && 'bg-[#FAFAFC]')}
              >
                {/* Absender */}
                <td className={tdClass}>
                  <span className={cx('block max-w-[200px] truncate', sub.status === 'Neu' ? 'font-semibold' : 'font-medium')}>{senderOf(sub)}</span>
                  {sub.name && sub.email && <span className="block max-w-[200px] truncate text-[13px] text-[#64748B]">{sub.email}</span>}
                  {sub.phone && <span className="block text-[12.5px] text-[#94A3B8]">{sub.phone}</span>}
                </td>

                {/* Betreff & Vorschau */}
                <td className={tdClass}>
                  <span className="flex max-w-[230px] items-center gap-1.5">
                    <span className="truncate">{sub.subject || 'Kein Betreff'}</span>
                    {hasAttachment(sub.id) && <Paperclip size={13} aria-label="mit Anhang" className="shrink-0 text-[#94A3B8]" />}
                  </span>
                  <span className="block max-w-[230px] truncate text-[13px] text-[#64748B]">{sub.message || '–'}</span>
                </td>

                {/* Formular & Herkunft */}
                <td className={cx(tdClass, 'text-[13px] text-[#64748B]')}>
                  <span className="block max-w-[150px] truncate" title={sub.type}>{sub.type}</span>
                  {sub.source_page && (
                    <span className="block max-w-[160px] truncate text-[12.5px] text-[#94A3B8]" title={sub.source_page}>
                      {sub.source_page.split('(')[0].trim()}
                    </span>
                  )}
                </td>

                {/* Datum */}
                <td className={cx(tdClass, 'whitespace-nowrap text-[13px] tabular-nums text-[#64748B]')}>{formatDate(sub.created_at)}</td>

                {/* Status mit Auswahlmenü */}
                <td className={cx(tdClass, 'whitespace-nowrap')} onClick={(e) => e.stopPropagation()}>
                  <Menu
                    label={`Status: ${st.label} – ändern`}
                    width={180}
                    trigger={(open) => (
                      <Badge tone={st.tone} dot>
                        {st.label}
                        <ChevronDown size={12} aria-hidden="true" className={cx('opacity-60 transition-transform', open && 'rotate-180')} />
                      </Badge>
                    )}
                    items={STATUS_OPTIONS.map((opt) => ({
                      label: <Badge tone={opt.tone} dot>{opt.label}</Badge>,
                      checked: sub.status === opt.value,
                      onSelect: () => onStatusChange(sub.id, opt.value),
                    }))}
                  />
                </td>

                {/* Aktionen */}
                <td className={cx(tdClass, 'text-right')} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onDelete(sub.id, senderOf(sub))}
                    className={iconButtonDangerClass}
                    aria-label={`Anfrage von ${senderOf(sub)} löschen`}
                    title="Löschen"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Kleinere Bildschirme: Liste */}
      <ul className="divide-y divide-[#F1F5F9] xl:hidden">
        {submissions.map((sub) => {
          const st = statusOf(sub.status)
          return (
            <li key={sub.id}>
              <button
                type="button"
                onClick={() => onOpen(sub)}
                className="flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left outline-none hover:bg-[#FAFAFC] focus-visible:bg-[#F1F5F9]"
              >
                <span className="flex items-center gap-2">
                  <span className={cx('min-w-0 flex-1 truncate text-[14px] text-[#0F172A]', sub.status === 'Neu' ? 'font-semibold' : 'font-medium')}>
                    {senderOf(sub)}
                  </span>
                  <Badge tone={st.tone} dot>{st.label}</Badge>
                </span>
                <span className="truncate text-[14px] text-[#0F172A]">{sub.subject || 'Kein Betreff'}</span>
                <span className="truncate text-[13px] text-[#64748B]">{sub.message || '–'}</span>
                <span className="text-[12.5px] tabular-nums text-[#94A3B8]">
                  {sub.type} · {formatDate(sub.created_at)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
