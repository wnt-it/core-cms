"use client";

// Kästchen für die Auswahl in Tabellen und Karten. Klicks gehen nicht an
// klickbare Zeilen weiter; Umschalt-Klick wählt einen Bereich.

import { useEffect, useRef } from "react";
import type { BulkSelection } from "./useBulkSelection";
import { cx } from "../ui/styles";

const boxClass =
  "h-[18px] w-[18px] shrink-0 cursor-pointer rounded-[5px] accent-[var(--admin-accent,#F18652)] outline-none focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]";

/** Kästchen für einen Eintrag. */
export function BulkCheckbox({ selection, id, label, className }: { selection: BulkSelection; id: string; label: string; className?: string }) {
  return (
    <input
      type="checkbox"
      checked={selection.isSelected(id)}
      aria-label={`${label} auswählen`}
      onClick={(e) => {
        e.stopPropagation();
        selection.toggle(id, e.shiftKey);
      }}
      onChange={() => {}}
      className={cx(boxClass, className)}
    />
  );
}

/** Kästchen „alle auswählen“ für den Tabellenkopf oder über Karten. */
export function BulkSelectAll({ selection, label = "Alle auswählen", className }: { selection: BulkSelection; label?: string; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = selection.someSelected;
  }, [selection.someSelected]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={selection.allSelected}
      aria-label={label}
      onChange={selection.toggleAll}
      onClick={(e) => e.stopPropagation()}
      className={cx(boxClass, className)}
    />
  );
}

/** Zeile „Alle auswählen“ über einer Kartenliste (Handy). */
export function BulkSelectAllRow({ selection, total }: { selection: BulkSelection; total: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 border-b border-[#F1F5F9] px-4 py-2.5 text-[13px] text-[#64748B]">
      <BulkSelectAll selection={selection} />
      {selection.count > 0 ? `${selection.count} von ${total} ausgewählt` : "Alle auswählen"}
    </label>
  );
}

/** Spaltenbreite für die Auswahl-Spalte (th/td). */
export const bulkCellClass = "w-10 !pr-0";
