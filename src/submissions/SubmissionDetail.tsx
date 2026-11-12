'use client'

// Detailansicht einer Anfrage (Seitenleiste rechts im Posteingang). Gleitet herein, sobald `open` wahr ist.

import type { Submission, SubmissionFile } from '../supabase/types'
import { Trash2, Mail, X, Paperclip, Download } from 'lucide-react'
import { buttonClass, cx, iconButtonClass, iconButtonDangerClass } from '../ui/styles'
import { Badge, Button, Segmented } from '../ui/components'
import { formatBytes } from '../ui/format'
import { FILE_STATUS, STATUS_OPTIONS, mailtoHref, senderOf, type StatusValue } from './submission-view'

interface SubmissionDetailProps {
  submission: Submission
  files: SubmissionFile[]
  open: boolean
  onClose: () => void
  onDelete: (id: string, name: string) => void
  onStatusChange: (id: string, status: StatusValue) => void
  onDownload: (file: SubmissionFile) => void
}

const linkClass = 'text-[#0F172A] underline decoration-[#CBD5E1] underline-offset-2 hover:decoration-current'

export default function SubmissionDetail({ submission: sub, files, open, onClose, onDelete, onStatusChange, onDownload }: SubmissionDetailProps) {
  const labels = sub.field_labels
  const mailto = mailtoHref(sub)

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        className={cx(
          'absolute inset-0 bg-[rgba(15,23,42,.28)] transition-opacity duration-200 ease-out motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden="true"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-title"
        className={cx(
          'absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-[#E2E8F0] bg-white shadow-[-12px_0_40px_rgba(15,23,42,.08)]',
          'transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          open ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0',
        )}
      >
        {/* Kopf */}
        <div className="flex items-center gap-3 border-b border-[#F1F5F9] px-4 py-4 sm:px-6">
          <Badge>{sub.type}</Badge>
          <span className="mr-auto truncate text-[13px] tabular-nums text-[#64748B]">{new Date(sub.created_at).toLocaleString('de-DE')}</span>
          <button
            type="button"
            onClick={() => onDelete(sub.id, senderOf(sub))}
            className={iconButtonDangerClass}
            aria-label="Anfrage löschen"
            title="Anfrage löschen"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={onClose} className={iconButtonClass} aria-label="Schließen (Esc)" title="Schließen (Esc)" autoFocus>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Inhalt */}
        <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-4 py-6 sm:px-6">
          {/* Betreff & Herkunft */}
          <div>
            <h2 id="submission-title" className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-[#0F172A]">
              {sub.subject || `${sub.type}-Anfrage`}
            </h2>
            <p className="mt-1 break-words text-[13px] text-[#64748B]">
              <span className="sr-only">Herkunft: </span>
              {sub.source_page || 'Kontaktseite (/kontakt)'}
              {sub.source_url && <> · {sub.source_url}</>}
            </p>
          </div>

          {/* Bearbeitungsstatus */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[#334155]">Status</span>
            <div className="max-w-full overflow-x-auto">
              <Segmented
                label="Bearbeitungsstatus"
                value={sub.status as StatusValue}
                onChange={(v) => onStatusChange(sub.id, v)}
                options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>
          </div>

          {/* Kontaktdaten */}
          <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-1 text-[14px] sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-y-2">
            {sub.name && (
              <>
                <dt className="text-[13px] text-[#64748B]">{labels?.name ?? 'Name'}</dt>
                <dd className="m-0 mb-2 text-[#0F172A] sm:mb-0">{sub.name}</dd>
              </>
            )}
            {sub.email && (
              <>
                <dt className="text-[13px] text-[#64748B]">{labels?.email ?? 'E-Mail'}</dt>
                <dd className="m-0 mb-2 break-all sm:mb-0">
                  <a href={mailto ?? undefined} className={linkClass}>
                    {sub.email}
                  </a>
                </dd>
              </>
            )}
            {sub.phone && (
              <>
                <dt className="text-[13px] text-[#64748B]">{labels?.phone ?? 'Telefon'}</dt>
                <dd className="m-0 mb-2 sm:mb-0">
                  <a href={`tel:${sub.phone}`} className={linkClass}>
                    {sub.phone}
                  </a>
                </dd>
              </>
            )}
            {sub.company && (
              <>
                <dt className="text-[13px] text-[#64748B]">{labels?.company ?? 'Firma'}</dt>
                <dd className="m-0 mb-2 text-[#0F172A] sm:mb-0">{sub.company}</dd>
              </>
            )}
          </dl>

          {/* Nachricht */}
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-[#334155]">{labels?.message ?? 'Nachricht'}</span>
            {sub.message ? (
              <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#1E293B]">{sub.message}</p>
            ) : (
              <p className="text-[14px] italic text-[#94A3B8]">Keine zusätzliche Nachricht übermittelt.</p>
            )}
          </div>

          {/* Dynamische Zusatzdaten (z. B. Projektdaten, Checkboxen, Sonderfelder) */}
          {sub.metadata && Object.keys(sub.metadata).length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-[#334155]">Weitere Angaben</span>
              <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-1 rounded-lg bg-[#FAFAFC] px-4 py-3.5 text-[14px] sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-y-2">
                {Object.entries(sub.metadata).map(([key, val]) => (
                  <div key={key} className="contents">
                    <dt className={cx('text-[13px] text-[#64748B]', !labels?.[key] && 'capitalize')}>{labels?.[key] ?? key.replace(/_/g, ' ')}</dt>
                    <dd className="m-0 mb-2 break-words text-[#0F172A] sm:mb-0">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Anhänge (privater Speicher, nur für angemeldete Admins) */}
          {files.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-[#334155]">Anhänge</span>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] px-3 py-2.5">
                    <Paperclip size={16} aria-hidden="true" className="shrink-0 text-[#94A3B8]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-[#0F172A]">{file.name}</span>
                      <span className="block text-[12.5px] text-[#64748B]">
                        {formatBytes(file.size)}
                        {FILE_STATUS[file.status] && <> · {FILE_STATUS[file.status]}</>}
                      </span>
                    </span>
                    {file.status === 'ok' && (
                      <button
                        type="button"
                        onClick={() => onDownload(file)}
                        className={iconButtonClass}
                        aria-label={`${file.name} herunterladen`}
                        title="Herunterladen"
                      >
                        <Download size={16} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Fuß */}
        <div className="flex items-center justify-end gap-2 border-t border-[#F1F5F9] bg-[#FAFAFC] px-4 py-3.5 sm:px-6">
          <Button variant="ghost" onClick={onClose}>
            Schließen
          </Button>
          {mailto && (
            <a href={mailto} className={buttonClass('primary', 'md', 'flex-1 sm:flex-none')}>
              <Mail size={16} aria-hidden="true" />
              Per E-Mail antworten
            </a>
          )}
        </div>
      </section>
    </div>
  )
}
