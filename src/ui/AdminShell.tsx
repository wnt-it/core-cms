"use client";

// Gerüst der Verwaltung (WNT-Backend): Seitenleiste mit „Inhalte“ und „System“,
// optionaler Umschalter (z. B. Abteilungen), Konto unten, Handy-Menü.
// Projekte übergeben nur Logo, Akzent und ihre Menüpunkte. Core-Seiten aus
// coreAdminPages erscheinen automatisch (Gruppe laut page.group, Standard „System“).
// Mein Konto öffnet sich über den Benutzer unten, die Core-Version über die Versionsangabe darüber.

import { useCallback, useEffect, useRef, useState, useTransition, type ComponentType, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, ImageIcon, LogOut, Menu, Package, X } from "lucide-react";
import { CORE_VERSION } from "../admin/core-version";
import { coreAdminNav as coreAdminPages, RETIRED_ADMIN_PATHS } from "../admin/core-nav";
import { createClient } from "../supabase/client";
import { CORE_TAGS_URL, newerVersions } from "../admin/version-compare";

const UPDATES_KEY = "core-cms-updates";

/** Anzahl neuerer Core-Versionen, einmal pro Browser-Sitzung von GitHub. Blockiert keine Server Actions. Fehler: keine Zahl. */
async function countCoreUpdates(): Promise<number> {
  try {
    const saved = sessionStorage.getItem(UPDATES_KEY);
    if (saved) {
      const { v, n } = JSON.parse(saved) as { v: string; n: number };
      if (v === CORE_VERSION && typeof n === "number") return n;
    }
  } catch {
    // Speicher nicht verfügbar
  }
  const res = await fetch(CORE_TAGS_URL, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return 0;
  const n = newerVersions(((await res.json()) as { name: string }[]).map((t) => t.name), CORE_VERSION).length;
  try {
    sessionStorage.setItem(UPDATES_KEY, JSON.stringify({ v: CORE_VERSION, n }));
  } catch {
    // Speicher nicht verfügbar
  }
  return n;
}
import MediaLibraryModal from "../media/MediaLibraryModal";
import { AdminToaster } from "./AdminToaster";
import { SUBMISSIONS_CHANGED_EVENT } from "../submissions/submission-view";
import { cx, iconButtonClass, WNT_COLORS } from "./styles";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  /** Nur bei genau dieser Adresse aktiv (z. B. Dashboard /admin). */
  exact?: boolean;
  /** Zahl rechts, z. B. neue Anfragen. */
  count?: number;
  /** Erklärung zur Zahl (Tooltip und Screenreader), z. B. „2 Updates verfügbar“. */
  countLabel?: string;
}

export interface AdminSwitcher {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => Promise<void>;
}

export interface AdminShellProps {
  logo: ReactNode;
  /** Akzentfarbe (Fokus, aktiver Menüpunkt, Schalter). Standard: WNT-IT-Orange. */
  accent?: string;
  content: AdminNavItem[];
  /** Eigene System-Punkte des Projekts (z. B. Einstellungen). Medien und Core-Seiten kommen dazu. */
  system?: AdminNavItem[];
  /** Optionale Core-Seiten, die im Menü erscheinen sollen (z. B. ["einwilligungen"], wenn das Projekt den Cookie-Banner nutzt). */
  optionalPages?: string[];
  switcher?: AdminSwitcher;
  userEmail: string;
  logoutAction: () => Promise<void>;
  /** Adresse für „Website ansehen“, Standard „/“. */
  siteUrl?: string;
  children: ReactNode;
}

const ICON = { size: 18, strokeWidth: 1.75 };

function isActive(pathname: string, item: AdminNavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

function NavLink({ item, pathname }: { item: AdminNavItem; pathname: string }) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors",
        active
          ? "bg-[color-mix(in_srgb,var(--admin-accent)_12%,white)] font-medium text-[#0F172A] [&_svg]:text-[color-mix(in_srgb,var(--admin-accent)_85%,black)]"
          : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] [&_svg]:text-[#94A3B8]",
      )}
    >
      <Icon {...ICON} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.count ? (
        <span title={item.countLabel} aria-label={item.countLabel} className="min-w-5 rounded-full bg-[color-mix(in_srgb,var(--admin-accent)_14%,white)] px-1.5 text-center text-[11px] font-semibold leading-5 text-[color-mix(in_srgb,var(--admin-accent)_55%,black)]">{item.count}</span>
      ) : null}
    </Link>
  );
}

function NavLabel({ children }: { children: ReactNode }) {
  return <p className="px-2.5 pb-1 text-[12px] font-medium text-[#94A3B8]">{children}</p>;
}

export function AdminShell({ logo, accent = WNT_COLORS.accent, content, system = [], optionalPages = [], switcher, userEmail, logoutAction, siteUrl = "/", children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [switching, startSwitch] = useTransition();
  const [updates, setUpdates] = useState(0);
  const [newSubmissions, setNewSubmissions] = useState(0);

  useEffect(() => setMenuOpen(false), [pathname]);
  // Neue Anfragen für die Zahl am Posteingang (nur angemeldete Admins dürfen lesen). Höchstens alle 30 Sekunden
  // beim Seitenwechsel neu, im Posteingang selbst immer (dort ändert sich die Zahl beim Öffnen von Anfragen).
  const countAt = useRef(0);
  const countNewSubmissions = useCallback(() => {
    countAt.current = Date.now();
    createClient()
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "Neu")
      .then(({ count }) => setNewSubmissions(count ?? 0), () => {});
  }, []);
  useEffect(() => {
    if (Date.now() - countAt.current < 30_000 && !pathname.startsWith("/admin/posteingang")) return;
    countNewSubmissions();
  }, [pathname, countNewSubmissions]);
  // Der Posteingang meldet Statuswechsel und Löschen, damit die Zahl nicht bis zum nächsten Seitenwechsel stehen bleibt
  useEffect(() => {
    window.addEventListener(SUBMISSIONS_CHANGED_EVENT, countNewSubmissions);
    return () => window.removeEventListener(SUBMISSIONS_CHANGED_EVENT, countNewSubmissions);
  }, [countNewSubmissions]);
  useEffect(() => {
    countCoreUpdates().then(setUpdates).catch(() => {});
  }, []);

  const toItem = (p: (typeof coreAdminPages)[number]): AdminNavItem => ({
    href: `/admin/${p.slug}`,
    label: p.label,
    icon: p.icon,
    ...(p.slug === "posteingang" ? { count: newSubmissions, countLabel: newSubmissions === 1 ? "1 neue Anfrage" : `${newSubmissions} neue Anfragen` } : {}),
  });
  const menuPages = coreAdminPages.filter((p) => p.inMenu !== false && (!p.optional || optionalPages.includes(p.slug)));
  // Core-Seiten gibt es nur einmal, aus dem Core. Ein Projekt-Menüpunkt mit derselben Adresse ist ein Fehler:
  // in der Entwicklung bricht die Seite mit Hinweis ab, live wird er weggelassen (die Website soll nicht ausfallen).
  const coreHrefs = new Set([...coreAdminPages.map((p) => p.slug), ...Object.keys(RETIRED_ADMIN_PATHS)].map((slug) => `/admin/${slug}`));
  const doppelt = [...content, ...system].filter((item) => coreHrefs.has(item.href)).map((item) => item.href);
  if (doppelt.length > 0) {
    const meldung = `[core-cms] Diese Menüpunkte kommen aus dem Core und dürfen nicht im Projekt-Menü (content/system der AdminShell) stehen: ${doppelt.join(", ")}. Bitte dort entfernen.`;
    if (process.env.NODE_ENV !== "production") throw new Error(meldung);
    console.error(meldung);
  }
  const ohneCore = (items: AdminNavItem[]) => items.filter((item) => !coreHrefs.has(item.href));
  // Seiten mit top stehen ganz oben in ihrer Gruppe (in „Inhalte“ nach dem Dashboard /admin), die übrigen Core-Seiten am Ende
  const group = (items: AdminNavItem[], pages: typeof menuPages) => {
    const own = ohneCore(items);
    const lead = own[0]?.href === "/admin" ? 1 : 0;
    return [...own.slice(0, lead), ...pages.filter((p) => p.top).map(toItem), ...own.slice(lead), ...pages.filter((p) => !p.top).map(toItem)];
  };
  const contentItems = group(content, menuPages.filter((p) => p.group === "content"));
  const systemItems = group(system, menuPages.filter((p) => p.group !== "content"));
  const versionItem: AdminNavItem = {
    href: "/admin/version",
    label: `Core v${CORE_VERSION}`,
    icon: Package,
    count: updates,
    countLabel: updates === 1 ? "1 Update verfügbar" : `${updates} Updates verfügbar`,
  };

  const style = {
    "--admin-accent": accent,
    "--admin-ring": `color-mix(in srgb, ${accent} 22%, transparent)`,
  } as CSSProperties;

  const sidebar = (
    <div className="flex h-full flex-col gap-5 px-3 pb-4 pt-5">
      <div className="flex items-center justify-between px-2.5">
        <Link href="/admin" className="flex min-h-8 items-center" aria-label="Zur Übersicht">
          {logo}
        </Link>
        <button type="button" className={cx(iconButtonClass, "lg:hidden")} onClick={() => setMenuOpen(false)} aria-label="Menü schließen">
          <X {...ICON} />
        </button>
      </div>

      {switcher && (
        <div role="group" aria-label={switcher.label} className={cx("grid rounded-lg bg-[#F1F5F9] p-0.5", switching && "opacity-60")} style={{ gridTemplateColumns: `repeat(${switcher.options.length}, minmax(0, 1fr))` }}>
          {switcher.options.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={o.value === switcher.value}
              disabled={switching}
              onClick={() => {
                if (o.value === switcher.value) return;
                startSwitch(async () => {
                  await switcher.onChange(o.value);
                  router.refresh();
                });
              }}
              className={cx(
                "h-8 cursor-pointer truncate rounded-md px-2 text-[13px] font-medium transition-colors",
                o.value === switcher.value ? "bg-white text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,.06)]" : "text-[#64748B] hover:text-[#0F172A]",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <nav aria-label="Hauptmenü" className="-mx-1 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1">
        <div className="flex flex-col gap-0.5">
          <NavLabel>Inhalte</NavLabel>
          {contentItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <NavLabel>System</NavLabel>
          <button
            type="button"
            onClick={() => setMediaOpen(true)}
            className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[14px] text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] [&_svg]:text-[#94A3B8]"
          >
            <ImageIcon {...ICON} />
            <span>Medien</span>
          </button>
          {systemItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-1 border-t border-[#F1F5F9] pt-3">
        <NavLink item={versionItem} pathname={pathname} />
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener"
          className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] [&_svg]:text-[#94A3B8]"
        >
          <ExternalLink {...ICON} />
          Website ansehen
        </a>
        <div className="flex items-center gap-1 pt-1">
          <Link
            href="/admin/konto"
            aria-current={pathname === "/admin/konto" ? "page" : undefined}
            title={`Mein Konto (${userEmail})`}
            className={cx(
              "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 pl-2.5 pr-1.5 transition-colors",
              pathname === "/admin/konto" ? "bg-[color-mix(in_srgb,var(--admin-accent)_12%,white)]" : "hover:bg-[#F1F5F9]",
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[12px] font-semibold uppercase text-[#334155]" aria-hidden="true">
              {userEmail.slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-[#475569]">{userEmail}</span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={iconButtonClass} aria-label="Ausloggen" title="Ausloggen">
              <LogOut {...ICON} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    // Überschriften erben die Admin-Schrift, auch wenn das Projekt-CSS h1–h6 eine eigene gibt
    <div className="relative flex h-dvh overflow-hidden bg-[#FAFAFC] font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] text-[14px] font-normal leading-normal text-[#0F172A] antialiased [&_:where(h1,h2,h3,h4,h5,h6)]:[font-family:inherit]!" style={style}>
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] border-r border-[#E2E8F0] bg-white transition-transform duration-200 lg:static lg:z-auto lg:w-[248px] lg:translate-x-0",
          menuOpen ? "translate-x-0 shadow-[12px_0_40px_rgba(15,23,42,.12)]" : "-translate-x-full",
        )}
      >
        {sidebar}
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-[rgba(15,23,42,.35)] lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[#E2E8F0] bg-white px-2 lg:hidden">
          <button type="button" className={cx(iconButtonClass, "h-11 w-11")} onClick={() => setMenuOpen(true)} aria-label="Menü öffnen" aria-expanded={menuOpen}>
            <Menu size={20} strokeWidth={1.75} />
          </button>
          <Link href="/admin" className="flex items-center">
            {logo}
          </Link>
        </div>
        <main className="relative min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pb-10 pt-6 sm:px-8 sm:pt-8">{children}</div>
        </main>
      </div>

      <MediaLibraryModal isOpen={mediaOpen} onClose={() => setMediaOpen(false)} onSelect={() => setMediaOpen(false)} multiSelect />
      <AdminToaster />
    </div>
  );
}
