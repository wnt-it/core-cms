'use client'

// Mehrzeiliges Textfeld des Rechtstext-Editors, das mit dem Inhalt wächst. Vorher Teil von LegalDocumentForm.tsx.

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { Textarea } from '../ui/components'
import { cx } from '../ui/styles'

/** Textfeld, das mit dem Inhalt wächst. */
export default function AutoTextarea({
  value,
  onChange,
  className,
  elRef,
  ...rest
}: React.ComponentProps<'textarea'> & { elRef?: (el: HTMLTextAreaElement | null) => void }) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  // Höhe vor dem Zeichnen setzen (useLayoutEffect) und die Scrollposition festhalten: Beim kurzen Zurücksetzen
  // auf „auto“ schrumpfte die Seite sonst, und beim Tippen sprang die Ansicht nach oben.
  const fit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const scroller = document.scrollingElement
    const top = scroller?.scrollTop ?? 0
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
    if (scroller && scroller.scrollTop !== top) scroller.scrollTop = top
  }, [])
  useLayoutEffect(fit, [value, fit])
  // Bei geänderter Breite (Fenster, Layout) neu anpassen; ein Beobachter pro Feld, nicht einer pro Tastendruck
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let width = el.offsetWidth
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth !== width) {
        width = el.offsetWidth
        fit()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit])
  return (
    <Textarea
      ref={(el) => {
        ref.current = el
        elRef?.(el)
      }}
      rows={1}
      value={value}
      onChange={onChange}
      className={cx('resize-none overflow-hidden', className)}
      {...rest}
      // Mindesthöhe einer Zeile (die Standardklasse der Textfelder hat 96 px)
      style={{ minHeight: 40, ...rest.style }}
    />
  )
}
