// Gemeinsame Klassen der Verwaltung (WNT-Backend). Nur Tailwind-Klassen und
// CSS-Variablen, damit Projekte nichts zusätzlich importieren müssen (core-cms
// wird per @source gescannt). Der Akzent kommt aus --admin-accent, das AdminShell
// setzt (Standard: WNT-IT-Orange, siehe WNT_COLORS).

/** Farben der WNT-IT-Marke (wnt-it.de): Orange als Akzent, Schiefer für Text, Knöpfe und Linien. */
export const WNT_COLORS = {
  accent: "#F18652",
  accentDark: "#E06D34",
  accentLight: "#FFF3EC",
  /** Orange für kleine Schrift auf hellem Grund (lesbar, ~5:1) */
  accentInk: "#B8480F",
  ink: "#0F172A",
  inkSoft: "#334155",
  background: "#FAFAFC",
} as const;

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Eingabefelder: ein Rahmen, Fokus mit weichem Ring statt doppeltem Rahmen. */
export const inputClass =
  "block w-full h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-[border-color,box-shadow] duration-[180ms] ease-out hover:border-[#CBD5E1] focus:border-[var(--admin-accent,#F18652)] focus:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))] disabled:bg-[#FAFAFC] disabled:text-[#94A3B8] aria-[invalid=true]:border-[#DC2626]";

export const textareaClass = cx(inputClass, "h-auto min-h-[96px] py-2 leading-relaxed");

export const selectClass = cx(
  inputClass,
  "appearance-none pr-9 bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[right_10px_center] bg-no-repeat",
);

export const cardClass = "rounded-xl border border-[#E2E8F0] bg-white";

export const labelClass = "text-[13px] font-medium text-[#334155]";
export const hintClass = "text-[12.5px] leading-snug text-[#64748B]";
export const mutedClass = "text-[13px] text-[#64748B]";

export const buttonBase =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,border-color,color,box-shadow] duration-150 outline-none focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))] disabled:pointer-events-none disabled:opacity-50 cursor-pointer whitespace-nowrap";

export const buttonVariants = {
  primary: "bg-[#0F172A] text-white hover:bg-[#1E293B]",
  secondary: "border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#FAFAFC] hover:border-[#CBD5E1]",
  ghost: "text-[#334155] hover:bg-[#F1F5F9]",
  danger: "text-[#B91C1C] hover:bg-[#FEF2F2]",
  "danger-solid": "bg-[#DC2626] text-white hover:bg-[#B91C1C]",
} as const;

export const buttonSizes = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[14px]",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra?: string) {
  return cx(buttonBase, buttonVariants[variant], buttonSizes[size], extra);
}

export const iconButtonClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] outline-none focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))] cursor-pointer";
export const iconButtonDangerClass = cx(iconButtonClass, "hover:bg-[#FEF2F2] hover:text-[#B91C1C]");

/** Tabellen */
export const tableClass = "w-full border-collapse text-[14px]";
export const thClass = "h-10 px-4 text-left text-[12.5px] font-medium text-[#64748B] bg-[#FAFAFC] border-b border-[#E2E8F0] whitespace-nowrap";
export const tdClass = "px-4 py-3 align-middle border-b border-[#F1F5F9] text-[#0F172A]";
export const trClass = "transition-colors hover:bg-[#FAFAFC]";
