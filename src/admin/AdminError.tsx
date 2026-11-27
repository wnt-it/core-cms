'use client'

// Fehlerseite für den Admin-Bereich (Next.js error.tsx). Statt einer weißen Seite oder der Standardmeldung
// sieht der Kunde einen verständlichen Hinweis und kann es erneut versuchen. Im Projekt einbinden:
//   app/admin/(dashboard)/error.tsx:  export { default } from "core-cms/src/admin/AdminError";

import { useEffect } from 'react'
import { Button, Card, Note } from '../ui/components'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin] Seite konnte nicht geladen werden', error)
  }, [error])

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <h1 className="text-[18px] font-semibold text-[#0F172A]">Diese Seite konnte nicht geladen werden</h1>
        <Note tone="error">
          Bitte versuch es erneut. Bleibt der Fehler, melde dich bitte bei WNT-IT
          {error.digest ? <> und nenne die Kennung <code className="font-mono">{error.digest}</code></> : null}.
        </Note>
        <div>
          <Button variant="primary" onClick={reset}>
            Erneut versuchen
          </Button>
        </div>
      </div>
    </Card>
  )
}
