// Gemeinsame Karten-Hülle für Login/Passwort-vergessen/Passwort-ändern.
// Server Component: holt Logo + Site-Name serverseitig aus site_settings und
// rendert sie über der Karte. Die Seiten liegen außerhalb von AdminShell, deshalb
// setzt die Hülle Akzent, Fokus-Ring, Schrift und Hintergrund selbst (wie AdminShell).

import type { CSSProperties, ReactNode } from "react";
import { getAuthBranding } from "./branding";
import { WNT_COLORS, cardClass, cx, hintClass } from "../ui/styles";

export interface AuthCardShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const style = {
  "--admin-accent": WNT_COLORS.accent,
  "--admin-ring": `color-mix(in srgb, ${WNT_COLORS.accent} 22%, transparent)`,
} as CSSProperties;

export default async function AuthCardShell({ title, subtitle, children, footer }: AuthCardShellProps) {
  const { siteName, logoUrl } = await getAuthBranding();

  return (
    <div
      style={style}
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-7 bg-[#FAFAFC] px-4 py-10 font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] text-[14px] font-normal leading-normal text-[#0F172A] antialiased [&_:where(h1,h2,h3,h4,h5,h6)]:[font-family:inherit]!"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={siteName} className="h-10 w-auto max-w-[240px] object-contain" />
      ) : (
        <span className="text-[18px] font-semibold tracking-[-0.01em] text-[#0F172A]">{siteName}</span>
      )}

      <div className={cx(cardClass, "w-full max-w-[380px]")}>
        <div className="flex flex-col gap-[18px] p-6">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.01em] text-[#0F172A]">{title}</h1>
            {subtitle && <p className={cx(hintClass, "mt-1 text-[13px]")}>{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>

      {footer && <div className="flex flex-col items-center gap-2 text-center text-[13px]">{footer}</div>}
      <p className={hintClass}>Betreut von WNT-IT</p>
    </div>
  );
}
