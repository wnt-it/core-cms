// Gemeinsame Karten-Hülle für Login/Passwort-vergessen/Passwort-ändern.
// Server Component: holt Logo + Site-Name serverseitig aus site_settings und
// rendert sie über dem Formular. Farb-/Schrift-Branding kommt automatisch über
// die Tailwind-Tokens `bg-primary`/`text-primary`/`font-display`/`font-sans`,
// die jedes Kundenprojekt in seiner eigenen index.css via @theme definiert
// (siehe core-cms/README.md) - core-cms muss die konkreten Werte nicht kennen.

import type { ReactNode } from "react";
import { getAuthBranding } from "./branding";

export interface AuthCardShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default async function AuthCardShell({ title, subtitle, children, footer }: AuthCardShellProps) {
  const { siteName, logoUrl } = await getAuthBranding();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-black/10 p-8 sm:p-10">

        <div className="flex flex-col items-center text-center mb-8">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="h-10 w-auto object-contain mb-6" />
          ) : (
            <span className="font-display font-bold text-lg text-black mb-6">{siteName}</span>
          )}
          <h1 className="font-display text-2xl font-bold text-black tracking-tight mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="font-sans text-sm text-neutral-500 leading-relaxed">{subtitle}</p>
          )}
        </div>

        {children}

        {footer && <div className="mt-6 text-center">{footer}</div>}

      </div>
    </div>
  );
}
