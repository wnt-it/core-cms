'use client'

// Unsichtbare Felder für den Spam-Schutz und die Herkunft (ab v0.15.0). Einmal in jedes Formular setzen:
//   <form …><FormGuard /> … </form>
// website: Feld, das nur Bots ausfüllen. form_age: Zeit seit Anzeige in ms (im Browser gemessen).
// source_page / source_url: Seite, auf der das Formular abgeschickt wurde.

import { useEffect, useRef, useState } from 'react'

export default function FormGuard() {
  const started = useRef(0)
  const [age, setAge] = useState('')
  const [page, setPage] = useState({ path: '', url: '' })

  useEffect(() => {
    started.current = Date.now()
    setPage({ path: window.location.pathname, url: window.location.href.slice(0, 500) })
    const timer = window.setInterval(() => setAge(String(Date.now() - started.current)), 500)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>
          Bitte leer lassen
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input type="hidden" name="form_age" value={age} />
      <input type="hidden" name="source_page" value={page.path} />
      <input type="hidden" name="source_url" value={page.url} />
    </>
  )
}
