"use client";

// Aufklappmenü für Aktionen mit eigenem Auslöser (z. B. Status-Kennzeichen,
// „…“-Knopf). Gleiches Aussehen wie das Auswahlfeld (Select), liegt als eigene
// Ebene über der Seite und wird so nicht von Tabellen oder Karten abgeschnitten.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { cx } from "./styles";

export interface MenuItem {
  label: ReactNode;
  onSelect: () => void;
  /** Häkchen rechts (z. B. aktueller Status). */
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
}

export function Menu({
  trigger,
  items,
  label,
  triggerClassName,
  align = "start",
  width = 200,
}: {
  /** Inhalt des Auslöse-Knopfs. */
  trigger: (open: boolean) => ReactNode;
  items: MenuItem[];
  /** Bezeichnung des Knopfs für Screenreader. */
  label: string;
  triggerClassName?: string;
  align?: "start" | "end";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const hasChecks = items.some((i) => i.checked !== undefined);

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(width, window.innerWidth - 16);
    const up = window.innerHeight - r.bottom < 220 && r.top > window.innerHeight - r.bottom;
    const left = Math.min(Math.max(8, align === "end" ? r.right - w : r.left), window.innerWidth - w - 8);
    setPos({ left, top: up ? r.top - 4 : r.bottom + 4, up });
  }, [align, width]);

  const close = (focus = true) => {
    setOpen(false);
    if (focus) triggerRef.current?.focus();
  };

  const openMenu = () => {
    place();
    const i = items.findIndex((it) => it.checked);
    setActive(i >= 0 ? i : 0);
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !menuRef.current?.contains(t)) close(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const run = (it: MenuItem) => {
    if (it.disabled) return;
    close();
    it.onSelect();
  };

  const onKey = (e: ReactKeyboardEvent) => {
    const move = (dir: 1 | -1) => {
      for (let i = active + dir; i >= 0 && i < items.length; i += dir) if (!items[i].disabled) return setActive(i);
    };
    if (e.key === "ArrowDown") (e.preventDefault(), move(1));
    else if (e.key === "ArrowUp") (e.preventDefault(), move(-1));
    else if (e.key === "Enter" || e.key === " ") (e.preventDefault(), items[active] && run(items[active]));
    else if (e.key === "Escape") (e.preventDefault(), close());
    else if (e.key === "Tab") close(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label}
        onClick={(e) => {
          // Klickbare Tabellenzeilen sollen nicht mitreagieren
          e.stopPropagation();
          if (open) close();
          else openMenu();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            openMenu();
          }
        }}
        className={cx("cursor-pointer rounded-md outline-none focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]", triggerClassName)}
      >
        {trigger(open)}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            id={id}
            role="menu"
            tabIndex={-1}
            aria-activedescendant={`${id}-${active}`}
            onKeyDown={onKey}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[100] rounded-xl border border-[#E2E8F0] bg-white p-1.5 text-left font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] text-[14px] font-normal leading-normal text-[#0F172A] shadow-[0_12px_32px_-8px_rgba(15,23,42,.18),0_2px_6px_rgba(15,23,42,.06)] antialiased outline-none focus-visible:outline-none"
            style={{ left: pos.left, width: Math.min(width, window.innerWidth - 16), ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
          >
            {items.map((it, i) => (
              <div
                key={i}
                id={`${id}-${i}`}
                role={hasChecks ? "menuitemradio" : "menuitem"}
                aria-checked={hasChecks ? !!it.checked : undefined}
                aria-disabled={it.disabled || undefined}
                onMouseEnter={() => !it.disabled && setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run(it)}
                className={cx(
                  "flex min-h-9 items-center gap-2 rounded-lg px-2.5 py-1.5",
                  it.disabled ? "cursor-default text-[#94A3B8]" : "cursor-pointer",
                  it.danger && !it.disabled && "text-[#B91C1C]",
                  i === active && !it.disabled && (it.danger ? "bg-[#FEF2F2]" : "bg-[#F1F5F9]"),
                  it.checked && "font-medium",
                )}
              >
                <span className="min-w-0 flex-1">{it.label}</span>
                {it.checked && <Check size={15} strokeWidth={2.25} className="shrink-0 text-[color-mix(in_srgb,var(--admin-accent,#F18652)_85%,black)]" aria-hidden="true" />}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
