"use client";

// Rückmeldungen im Admin („Gespeichert.“, Fehlermeldungen) brauchen eine Stelle, an der sie erscheinen.
// Bisher musste jedes Projekt dafür selbst einen <Toaster> in sein Layout setzen, sonst blieben alle
// Meldungen unsichtbar. Jetzt bringt das Admin-Gerüst einen mit, aber nur, wenn die Seite noch keinen
// hat (sonst erschiene jede Meldung doppelt). Projekte mit eigenem Toaster ändern sich also nicht.

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

// sonner rendert pro Toaster einen <section aria-label="Notifications …">, auch ohne Meldungen
const TOASTER_SELECTOR = 'section[aria-label^="Notifications"]';

export function AdminToaster() {
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    setNeeded(!document.querySelector(TOASTER_SELECTOR));
  }, []);

  return needed ? <Toaster position="bottom-right" richColors closeButton /> : null;
}

export default AdminToaster;
