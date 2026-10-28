"use client";

// Gerüst der Verwaltung (WNT-Backend): Seitenleiste mit „Inhalte“ und „System“,
// optionaler Umschalter (z. B. Abteilungen), Konto unten, Handy-Menü.
// Projekte übergeben nur Logo, Akzent und ihre Menüpunkte. Core-Seiten aus
// coreAdminPages erscheinen automatisch (Gruppe laut page.group, Standard „System“).

import { useEffect, useState, useTransition, type ComponentType, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, ImageIcon, LogOut, Menu, X } from "lucide-react";
import { coreAdminPages } from "../admin/core-pages";
import MediaLibraryModal from "../media/MediaLibraryModal";
import { cx, iconButtonClass, WNT_COLORS } from "./styles";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  /** Nur bei genau dieser Adresse aktiv (z. B. Dashboard /admin). */
  exact?: boolean;
  /** Zahl rechts, z. B. neue Anfragen. */
  count?: number;
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
  /** Eigene System-Punkte des Projekts (z. B. Backup). Medien und Core-Seiten kommen dazu. */
  system?: AdminNavItem[];
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
        <span className="min-w-5 rounded-full bg-[color-mix(in_srgb,var(--admin-accent)_14%,white)] px-1.5 text-center text-[11px] font-semibold leading-5 text-[color-mix(in_srgb,var(--admin-accent)_55%,black)]">{item.count}</span>
      ) : null}
    </Link>
  );
}

function NavLabel({ children }: { children: ReactNode }) {
  return <p className="px-2.5 pb-1 text-[12px] font-medium text-[#94A3B8]">{children}</p>;
}

export function AdminShell({ logo, accent = WNT_COLORS.accent, content, system = [], switcher, userEmail, logoutAction, siteUrl = "/", children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [switching, startSwitch] = useTransition();

  useEffect(() => setMenuOpen(false), [pathname]);

  const toItem = (p: (typeof coreAdminPages)[number]): AdminNavItem => ({ href: `/admin/${p.slug}`, label: p.label, icon: p.icon });
  const contentItems = [...content, ...coreAdminPages.filter((p) => p.group === "content").map(toItem)];
  const systemItems = [...system, ...coreAdminPages.filter((p) => p.group !== "content").map(toItem)];

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
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener"
          className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] [&_svg]:text-[#94A3B8]"
        >
          <ExternalLink {...ICON} />
          Website ansehen
        </a>
        <div className="flex items-center gap-2.5 pl-2.5 pt-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[12px] font-semibold uppercase text-[#334155]" aria-hidden="true">
            {userEmail.slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-[#475569]" title={userEmail}>
            {userEmail}
          </span>
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
    </div>
  );
}
