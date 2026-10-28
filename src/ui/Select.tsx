"use client";

// Auswahlfeld der Verwaltung (WNT-Backend): eigenes Aufklappmenü statt der
// Browser-Liste, überall gleich. Versteht dieselbe Schreibweise wie <select>
// (<option>, <optgroup>, value/defaultValue, onChange mit e.target.value, name,
// required, disabled), damit bestehende Stellen nur das Element tauschen.
// Ab 9 Einträgen erscheint oben eine Suche.

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cx, inputClass } from "./styles";

interface Opt {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
}

const SEARCH_FROM = 9;

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function collect(children: ReactNode, group?: string, out: Opt[] = []): Opt[] {
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: unknown; children?: ReactNode; disabled?: boolean; label?: string }>(child)) return;
    if (child.type === "optgroup") {
      collect(child.props.children, child.props.label, out);
    } else if (child.type === "option") {
      const label = textOf(child.props.children);
      out.push({ value: child.props.value == null ? label : String(child.props.value), label, group, disabled: child.props.disabled });
    } else if (child.props.children) {
      collect(child.props.children, group, out);
    }
  });
  return out;
}

const norm = (s: string) => s.toLocaleLowerCase("de").normalize("NFD").replace(/[̀-ͯ]/g, "");

type SelectProps = Omit<ComponentProps<"select">, "multiple" | "size">;

export function Select({
  value,
  defaultValue,
  onChange,
  name,
  required,
  disabled,
  className,
  children,
  id,
  title,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: SelectProps) {
  const options = useMemo(() => collect(children), [children]);
  const controlled = value !== undefined;
  const [inner, setInner] = useState(() => String(defaultValue ?? options.find((o) => !o.disabled)?.value ?? ""));
  const current = controlled ? String(value ?? "") : inner;
  const selected = options.find((o) => o.value === current);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxHeight: number; up: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const autoId = useId();
  const triggerId = id ?? autoId;
  const listId = `${autoId}-liste`;
  const searchable = options.length >= SEARCH_FROM;

  const visible = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return options;
    return options.filter((o) => norm(o.label).includes(q) || (o.group && norm(o.group).includes(q)));
  }, [options, query]);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const up = below < 240 && above > below;
    // Breite nach dem längsten Eintrag (grob geschätzt), mindestens wie das Feld
    const longest = options.reduce((m, o) => Math.max(m, o.label.length + (o.group ? 2 : 0)), 0);
    const width = Math.min(Math.max(r.width, 200, longest * 7.6 + 64), 380, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    setPos({ left, top: up ? r.top - 4 : r.bottom + 4, width, maxHeight: Math.min(340, (up ? above : below) - 4), up });
  }, [options]);

  const openMenu = () => {
    if (disabled) return;
    setQuery("");
    const i = options.findIndex((o) => o.value === current);
    setActive(i >= 0 ? i : options.findIndex((o) => !o.disabled));
    place();
    setOpen(true);
  };

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (o: Opt) => {
    if (o.disabled) return;
    if (!controlled) setInner(o.value);
    if (o.value !== current) {
      // Wie bei <select>: Aufrufer lesen e.target.value (und ggf. name)
      const target = { value: o.value, name: name ?? "" };
      onChange?.({ target, currentTarget: target } as unknown as ChangeEvent<HTMLSelectElement>);
    }
    close();
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    (searchable ? searchRef.current : listRef.current)?.focus();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !listRef.current?.parentElement?.contains(t)) close(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Aktiven Eintrag sichtbar halten
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, visible]);

  useEffect(() => {
    if (open) setActive(visible.findIndex((o) => !o.disabled));
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = (dir: 1 | -1, from = active) => {
    for (let i = from + dir; i >= 0 && i < visible.length; i += dir) {
      if (!visible[i].disabled) return setActive(i);
    }
  };

  const onListKey = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      step(1, -1);
    } else if (e.key === "End") {
      e.preventDefault();
      step(-1, visible.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (visible[active]) choose(visible[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    } else if (!searchable && e.key.length === 1) {
      // Tippen springt zum passenden Eintrag
      const now = Date.now();
      typed.current.text = (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase();
      typed.current.at = now;
      const hit = visible.findIndex((o) => !o.disabled && norm(o.label).startsWith(norm(typed.current.text)));
      if (hit >= 0) setActive(hit);
    }
  };

  const onTriggerKey = (e: ReactKeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openMenu();
    }
  };

  const activeId = open && visible[active] ? `${listId}-${active}` : undefined;

  const menu =
    open && pos
      ? createPortal(
          <div
            className="fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] text-[14px] font-normal leading-normal text-[#0F172A] shadow-[0_12px_32px_-8px_rgba(15,23,42,.18),0_2px_6px_rgba(15,23,42,.06)] antialiased"
            style={{ left: pos.left, width: pos.width, maxHeight: pos.maxHeight, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
          >
            {searchable && (
              <div className="relative border-b border-[#F1F5F9] p-1.5">
                <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onListKey}
                  placeholder="Suchen …"
                  aria-label="Einträge durchsuchen"
                  aria-controls={listId}
                  aria-activedescendant={activeId}
                  className="h-9 w-full rounded-lg bg-[#F8FAFC] pl-8 pr-2 text-[14px] outline-none focus-visible:outline-none placeholder:text-[#94A3B8] focus:bg-[#F1F5F9]"
                />
              </div>
            )}
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={ariaLabelledBy ?? triggerId}
              aria-activedescendant={searchable ? undefined : activeId}
              onKeyDown={searchable ? undefined : onListKey}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 outline-none focus-visible:outline-none"
            >
              {visible.length === 0 && <p className="px-2.5 py-2 text-[13px] text-[#64748B]">Keine Treffer</p>}
              {visible.map((o, i) => {
                const showGroup = o.group && o.group !== visible[i - 1]?.group;
                const isSel = o.value === current;
                return (
                  <div key={`${o.group ?? ""}:${o.value}`}>
                    {showGroup && (
                      <div className={cx("px-2.5 pb-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#94A3B8]", i > 0 ? "mt-1.5 border-t border-[#F1F5F9] pt-2" : "pt-1")} role="presentation">
                        {o.group}
                      </div>
                    )}
                    <div
                      id={`${listId}-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={isSel}
                      aria-disabled={o.disabled || undefined}
                      onMouseEnter={() => !o.disabled && setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(o)}
                      className={cx(
                        "flex min-h-9 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[14px]",
                        o.group && "pl-4",
                        o.disabled ? "cursor-default text-[#94A3B8]" : "cursor-pointer",
                        i === active && !o.disabled && "bg-[#F1F5F9]",
                        isSel && "font-medium",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      {isSel && !o.disabled && <Check size={15} strokeWidth={2.25} className="shrink-0 text-[color-mix(in_srgb,var(--admin-accent,#F18652)_85%,black)]" aria-hidden="true" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <span className="relative block min-w-0">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        title={title}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKey}
        className={cx(
          inputClass,
          "flex cursor-pointer items-center gap-2 pr-2.5 text-left disabled:cursor-default",
          open && "border-[var(--admin-accent,#F18652)] shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]",
          className,
        )}
      >
        <span className={cx("min-w-0 flex-1 truncate", (!selected || selected.disabled) && "text-[#94A3B8]")}>{selected?.label ?? "Bitte wählen"}</span>
        <ChevronDown size={16} strokeWidth={2} className={cx("shrink-0 text-[#64748B] transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      {required && (
        // Pflichtfeld: der Browser meldet ein leeres Feld wie bei <select required>
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={selected && !selected.disabled ? current : ""}
          onChange={() => {}}
          onFocus={() => triggerRef.current?.focus()}
          className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
        />
      )}
      {menu}
    </span>
  );
}
