// Bausteine der Verwaltung (WNT-Backend). Aufbau jeder Seite:
// PageHeader -> Section (links Titel + Erklärung, rechts Card) -> SaveBar.
// Listen: PageHeader -> TableCard (Toolbar + Tabelle). Siehe README "Admin-UI".

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  buttonClass,
  cardClass,
  cx,
  hintClass,
  inputClass,
  labelClass,
  textareaClass,
  type ButtonSize,
  type ButtonVariant,
} from "./styles";

/* ---------- Seitenkopf ---------- */

export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Zurück-Link über dem Titel, z. B. { href: "/admin/brands", label: "Marken" } */
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {back && (
        <Link href={back.href} className="inline-flex w-fit items-center gap-1 text-[13px] text-[#64748B] hover:text-[#0F172A]">
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      )}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-[#0F172A]">{title}</h1>
          {description && <p className="mt-1 max-w-[70ch] text-[14px] text-[#64748B]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    </div>
  );
}

/* ---------- Abschnitt: links Erklärung, rechts Karte ---------- */

export function Section({
  title,
  description,
  children,
  id,
  bare = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  id?: string;
  /** true: rechts keine Karte, z. B. für eigene Karten oder Tabellen. */
  bare?: boolean;
}) {
  return (
    <section id={id} className="grid gap-4 border-t border-[#E2E8F0] py-8 first:border-t-0 first:pt-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="text-[15px] font-semibold text-[#0F172A]">{title}</h2>
        {description && <p className={cx(hintClass, "mt-1 text-[13px]")}>{description}</p>}
      </div>
      {bare ? <div className="min-w-0">{children}</div> : <Card>{children}</Card>}
    </section>
  );
}

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <div className={cx(cardClass, "min-w-0", className)}>
      {padded ? <div className="flex flex-col gap-5 p-5 sm:p-6">{children}</div> : children}
    </div>
  );
}

/** Fußzeile einer Karte, z. B. mit Anzahl und Knöpfen. */
export function CardFooter({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#F1F5F9] bg-[#FAFAFC] px-5 py-3 [&>*:first-child:not(:last-child)]:mr-auto rounded-b-xl">{children}</div>;
}

/** Zwei Spalten in einer Karte (auf dem Handy eine). Kind mit className="sm:col-span-2" für volle Breite. */
export function FieldGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={cx("grid gap-5", cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>{children}</div>;
}

/* ---------- Formularfelder ---------- */

export function Field({
  label,
  optional,
  hint,
  error,
  children,
  className,
  as = "label",
}: {
  label: ReactNode;
  optional?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
  /** "div", wenn das Feld mehrere Bedienelemente enthält (z. B. Bildauswahl). */
  as?: "label" | "div";
}) {
  const Tag = as;
  return (
    <Tag className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <span className={labelClass}>
        {label}
        {optional && <span className="font-normal text-[#94A3B8]"> (optional)</span>}
      </span>
      {children}
      {error ? <span className="text-[12.5px] text-[#B91C1C]">{error}</span> : hint ? <span className={hintClass}>{hint}</span> : null}
    </Tag>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, className)} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(textareaClass, className)} />;
}

/** Auswahlfeld: eigenes Aufklappmenü, Schreibweise wie <select> (siehe Select.tsx). */
export { Select } from "./Select";
export { Menu } from "./Menu";
export type { MenuItem } from "./Menu";

/** Eingabe mit Zusatz rechts, z. B. „€“ oder „/marken/…“. */
export function AffixInput({ suffix, className, ...props }: ComponentProps<"input"> & { suffix: ReactNode }) {
  return (
    <span className="relative flex">
      <input {...props} className={cx(inputClass, "pr-24", className)} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-[#94A3B8]">{suffix}</span>
    </span>
  );
}

/** Ein/Aus-Schalter. Als Formularfeld nutzbar (name/defaultChecked) oder kontrolliert (checked/onChange). */
export function Switch({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <span className={cx("relative inline-flex h-6 w-10 shrink-0", className)}>
      <input
        type="checkbox"
        role="switch"
        {...props}
        className="peer absolute inset-0 z-10 m-0 cursor-pointer appearance-none rounded-full outline-none disabled:cursor-not-allowed"
      />
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[#E2E8F0] transition-colors duration-[180ms] peer-checked:bg-[var(--admin-accent,#F18652)] peer-focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))] peer-disabled:opacity-50" />
      <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,.2)] transition-transform duration-[180ms] peer-checked:translate-x-4" />
    </span>
  );
}

/** Zeile mit Text links und Schalter rechts. */
export function SwitchRow({
  label,
  hint,
  divider = false,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: ReactNode; hint?: ReactNode; divider?: boolean }) {
  return (
    <label className={cx("flex cursor-pointer items-center justify-between gap-6", divider && "border-t border-[#F1F5F9] pt-5")}>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-[#0F172A]">{label}</span>
        {hint && <span className={cx(hintClass, "mt-0.5 block")}>{hint}</span>}
      </span>
      <Switch aria-label={typeof label === "string" ? label : undefined} {...props} />
    </label>
  );
}

/* ---------- Knöpfe ---------- */

type ButtonOwnProps = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant = "secondary", size = "md", className, type = "button", ...props }: ComponentProps<"button"> & ButtonOwnProps) {
  return <button type={type} {...props} className={buttonClass(variant, size, className)} />;
}

export function ButtonLink({ variant = "secondary", size = "md", className, ...props }: ComponentProps<typeof Link> & ButtonOwnProps) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

/* ---------- Speichern-Leiste ---------- */

/** Unten an Formularen: links optional „… löschen“ oder Hinweis, rechts Abbrechen und Speichern. */
export function SaveBar({ start, children }: { start?: ReactNode; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-wrap items-center gap-2 border-t border-[#E2E8F0] bg-[#FAFAFC]/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:flex-nowrap sm:px-8">
      {start}
      <span className="hidden flex-1 sm:block" />
      {/* Auf dem Handy volle Breite, rechts der Hauptknopf */}
      <div className="flex w-full gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">{children}</div>
    </div>
  );
}

/* ---------- Kennzeichen, Hinweise, leere Zustände ---------- */

const badgeTones = {
  neutral: "bg-[#F1F5F9] text-[#334155]",
  accent: "bg-[color-mix(in_srgb,var(--admin-accent,#F18652)_12%,white)] text-[color-mix(in_srgb,var(--admin-accent,#F18652)_80%,black)]",
  green: "bg-[#F0FDF4] text-[#166534]",
  amber: "bg-[#FFFBEB] text-[#92400E]",
  blue: "bg-[#EFF6FF] text-[#1E40AF]",
  red: "bg-[#FEF2F2] text-[#991B1B]",
} as const;

export function Badge({ tone = "neutral", dot = false, children }: { tone?: keyof typeof badgeTones; dot?: boolean; children: ReactNode }) {
  return (
    <span className={cx("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[12px] font-medium", badgeTones[tone])}>
      {dot && <i className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Note({ tone = "info", children, action }: { tone?: "info" | "warn" | "error"; children: ReactNode; action?: ReactNode }) {
  const tones = {
    info: "border-[#E2E8F0] bg-white text-[#334155]",
    warn: "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]",
    error: "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]",
  };
  return (
    <div role={tone === "error" ? "alert" : undefined} className={cx("flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-[13.5px]", tones[tone])}>
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      {icon && <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#64748B]">{icon}</span>}
      <p className="text-[15px] font-medium text-[#0F172A]">{title}</p>
      {description && <p className="max-w-[44ch] text-[13.5px] text-[#64748B]">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ---------- Tabellen ---------- */

/** Karte um eine Liste: oben Suche/Filter (toolbar), darunter die Tabelle, optional Fußzeile. */
export function TableCard({ toolbar, children, footer }: { toolbar?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className={cx(cardClass, "min-w-0 overflow-hidden")}>
      {toolbar && <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] p-3">{toolbar}</div>}
      <div className="overflow-x-auto">{children}</div>
      {footer && <div className="flex items-center justify-center gap-2 border-t border-[#F1F5F9] px-4 py-3">{footer}</div>}
    </div>
  );
}

export function SearchInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <span className={cx("relative flex min-w-[200px] flex-1 sm:max-w-[340px]", className)}>
      <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input type="search" {...props} className={cx(inputClass, "pl-9")} />
    </span>
  );
}

/** Segment-Umschalter, z. B. „Alle | Verfügbar | Verkauft“. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg bg-[#F1F5F9] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-8 cursor-pointer rounded-md px-3 text-[13px] font-medium transition-colors",
            o.value === value ? "bg-white text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,.06)]" : "text-[#64748B] hover:text-[#0F172A]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
