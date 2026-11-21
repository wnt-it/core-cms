'use client'

// Live-Anzeige „Klappt der Mail-Versand?“ (ab v0.18.0). Prüft beim Öffnen die Verbindung zum Mailserver mit den
// gespeicherten Einstellungen, ohne eine E-Mail zu senden: Server erreichbar, Verbindung verschlüsselt mit gültigem
// Zertifikat, Anmeldung. Nur in den Einstellungen (E-Mail & SMTP), keine Anzeige auf dem Dashboard.

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, Loader2, Minus, RefreshCw, X, XCircle } from 'lucide-react'
import { checkSmtpConnection } from './settings-actions'
import type { SmtpCheckResult, SmtpCheckStep } from '../email/smtp-check-types'
import { cardClass, cx, hintClass, mutedClass } from '../ui/styles'
import { Button } from '../ui/components'

export interface SmtpStatusProps {
  /** Wechselt der Wert, wird sofort neu geprüft (z. B. nach dem Speichern der Einstellungen). */
  refreshKey?: number
  className?: string
}

type State = { status: 'loading' } | { status: 'done'; result: SmtpCheckResult } | { status: 'error' }

const STEP_LABELS = {
  server: 'Server erreichbar',
  encryption: 'Verbindung verschlüsselt, Zertifikat gültig',
  login: 'Anmeldung mit Benutzername und Passwort',
} as const

function StepIcon({ step }: { step: SmtpCheckStep }) {
  if (step === 'ok') return <Check size={15} className="text-[#15803D]" aria-hidden="true" />
  if (step === 'fail') return <X size={15} className="text-[#B91C1C]" aria-hidden="true" />
  return <Minus size={15} className="text-[#CBD5E1]" aria-hidden="true" />
}

const stepText: Record<SmtpCheckStep, string> = { ok: 'in Ordnung', fail: 'fehlgeschlagen', skip: 'nicht geprüft' }

function time(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function SmtpStatus({ refreshKey = 0, className }: SmtpStatusProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const run = useRef(0)

  const check = useCallback(async (fresh: boolean) => {
    const id = ++run.current
    setState({ status: 'loading' })
    try {
      const r = await checkSmtpConnection({ fresh })
      if (id !== run.current) return
      if ('notLoggedIn' in r) setState({ status: 'error' })
      else setState({ status: 'done', result: r })
    } catch {
      if (id === run.current) setState({ status: 'error' })
    }
  }, [])

  useEffect(() => {
    check(refreshKey > 0)
  }, [check, refreshKey])

  const result = state.status === 'done' ? state.result : null
  const incomplete = result?.problem === 'incomplete'
  const tone = state.status === 'loading' ? 'loading' : result?.ok ? (result.certCheckSkipped ? 'warn' : 'ok') : incomplete ? 'warn' : 'error'

  const title =
    state.status === 'loading'
      ? 'Verbindung zum Mailserver wird geprüft …'
      : state.status === 'error'
        ? 'Prüfung nicht möglich'
        : result!.ok
          ? 'Mail-Versand funktioniert'
          : incomplete
            ? 'Mail-Versand noch nicht eingerichtet'
            : 'Mail-Versand gestört'

  const Icon = tone === 'loading' ? Loader2 : tone === 'ok' ? CheckCircle2 : tone === 'warn' ? AlertTriangle : XCircle
  const iconColor = tone === 'loading' ? 'text-[#64748B] animate-spin' : tone === 'ok' ? 'text-[#15803D]' : tone === 'warn' ? 'text-[#B45309]' : 'text-[#B91C1C]'
  const showSteps = result && !incomplete

  return (
    <section
      aria-live="polite"
      aria-busy={state.status === 'loading'}
      className={cx(
        cardClass,
        'p-5 sm:p-6',
        tone === 'error' && 'border-[#FECACA]',
        tone === 'warn' && 'border-[#FDE68A]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} className={cx('mt-0.5 shrink-0', iconColor)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[14.5px] font-semibold text-[#0F172A]">{title}</h3>
          {state.status === 'error' && <p className={cx(hintClass, 'mt-1')}>Die Verbindung zum Server der Website ist fehlgeschlagen. Bitte lade die Seite neu.</p>}
          {result && <p className="mt-1 text-[13.5px] leading-snug text-[#334155]">{result.message}</p>}
          {result?.hint && <p className={cx(hintClass, 'mt-1')}>{result.hint}</p>}

          {showSteps && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {(['server', 'encryption', 'login'] as const).map((k) => (
                <li key={k} className="flex items-center gap-2 text-[13px] text-[#334155]">
                  <StepIcon step={result.steps[k]} />
                  <span>
                    {k === 'encryption' && result.certCheckSkipped ? 'Verbindung verschlüsselt (Zertifikat wird nicht geprüft)' : STEP_LABELS[k]}
                    <span className="sr-only">: {stepText[result.steps[k]]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {result && !incomplete && (
              <span className={mutedClass}>
                {result.cached ? 'Zuletzt geprüft' : 'Geprüft'} um {time(result.checkedAt)} Uhr
                {result.host ? ` · ${result.host}:${result.port}` : ''}
              </span>
            )}
            <span className="ml-auto flex items-center gap-2">
              {!incomplete && (
                <Button size="sm" variant="ghost" onClick={() => check(true)} disabled={state.status === 'loading'}>
                  <RefreshCw size={14} aria-hidden="true" />
                  <span>Erneut prüfen</span>
                </Button>
              )}
            </span>
          </div>
          <p className={cx(hintClass, 'mt-2')}>
            Es wird keine E-Mail gesendet. Ob Absender- und Empfängeradresse angenommen werden, zeigt die Test-E-Mail.
          </p>
        </div>
      </div>
    </section>
  )
}

export default SmtpStatus
