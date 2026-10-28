"use client";

// Auswahl für die Mehrfachbearbeitung. Bekommt die IDs der gerade sichtbaren
// Einträge: Was durch Suche/Filter verschwindet, wird abgewählt, damit nie
// unsichtbare Einträge mitgeändert werden. Umschalt-Klick wählt einen Bereich.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface BulkSelection {
  /** Ausgewählte IDs in der Reihenfolge der Liste */
  ids: string[];
  count: number;
  isSelected: (id: string) => boolean;
  /** Mit range = true (Umschalt-Klick) wird alles seit dem letzten Klick mit umgeschaltet. */
  toggle: (id: string, range?: boolean) => void;
  allSelected: boolean;
  someSelected: boolean;
  toggleAll: () => void;
  clear: () => void;
}

export function useBulkSelection(visibleIds: string[]): BulkSelection {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const last = useRef<string | null>(null);
  const key = visibleIds.join("|");

  useEffect(() => {
    const visible = new Set(visibleIds);
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const toggle = useCallback(
    (id: string, range = false) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const on = !prev.has(id);
        const from = range && last.current ? visibleIds.indexOf(last.current) : -1;
        const to = visibleIds.indexOf(id);
        if (from >= 0 && to >= 0) {
          for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
            if (on) next.add(visibleIds[i]);
            else next.delete(visibleIds[i]);
          }
        } else if (on) next.add(id);
        else next.delete(id);
        return next;
      });
      last.current = id;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  return useMemo(
    () => ({
      ids: visibleIds.filter((id) => selected.has(id)),
      count: selected.size,
      isSelected: (id: string) => selected.has(id),
      toggle,
      allSelected,
      someSelected: selected.size > 0 && !allSelected,
      toggleAll: () => setSelected(allSelected ? new Set() : new Set(visibleIds)),
      clear: () => setSelected(new Set()),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, key, allSelected, toggle],
  );
}
