import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import { AccountPage } from "../auth";
import VersionPage from "./VersionPage";
import SettingsPage, { type EinstellungenOptions } from "./SettingsPage";
import PopupPage from "../popup/PopupPage";
import ConsentAdminPage from "../consent/ConsentAdminPage";
import AdminSubmissionsPage from "../submissions/AdminSubmissionsPage";
import LegalDocumentPage from "../legal/LegalDocumentPage";
import ImpressumPage from "../legal/ImpressumPage";
import { IMPRESSUM_SLUG } from "../legal/impressum";
import { coreAdminNav, type CoreAdminNavEntry } from "./core-nav";

export { RETIRED_ADMIN_PATHS } from "./core-nav";

// Rechtstexte: Seiten /datenschutz und /impressum liefert LegalRoute (siehe legal/LegalRoute.tsx) aus denselben Daten.
const DatenschutzAdminPage = () => <LegalDocumentPage slug="datenschutz" label="Datenschutzerklärung" publicPath="/datenschutz" />;
const ImpressumAdminPage = () => <ImpressumPage slug={IMPRESSUM_SLUG} publicPath="/impressum" />;

/** Projektspezifische Angaben für Core-Seiten, im Catch-all an CoreAdminRoute übergeben (siehe README). */
export interface CoreAdminOptions {
  einstellungen?: EinstellungenOptions;
}

export interface CoreAdminPage extends CoreAdminNavEntry {
  Component: ComponentType<{ options?: CoreAdminOptions }>;
}

const COMPONENTS: Record<string, CoreAdminPage["Component"]> = {
  posteingang: () => <AdminSubmissionsPage />,
  einstellungen: ({ options }) => <SettingsPage options={options?.einstellungen} />,
  popup: PopupPage,
  datenschutz: DatenschutzAdminPage,
  impressum: ImpressumAdminPage,
  einwilligungen: ConsentAdminPage,
  konto: AccountPage,
  version: VersionPage,
};

/**
 * Zentrale Liste generischer Admin-Seiten aus core-cms. Jedes Kundenprojekt
 * bindet EINMALIG den Catch-all-Route-Stub ein
 * (app/admin/(dashboard)/[...core]/page.tsx -> CoreAdminRoute). Das Menü baut
 * AdminShell aus core-nav.ts. Ein neuer Eintrag (dort plus Komponente hier)
 * landet danach in jedem Projekt automatisch beim nächsten core-cms-Versionsbump.
 */
export const coreAdminPages: CoreAdminPage[] = coreAdminNav.map((entry) => {
  const Component = COMPONENTS[entry.slug];
  if (!Component) throw new Error(`core-cms: Für die Core-Seite "${entry.slug}" fehlt die Komponente in core-pages.tsx.`);
  return { ...entry, Component };
});

export function getCoreAdminPage(slug: string): CoreAdminPage | undefined {
  return coreAdminPages.find((page) => page.slug === slug);
}

/** Seitentitel für den Browser-Tab, z. B. „Pop-up — Admin“. Im Projekt mit
 *  `export { generateCoreAdminMetadata as generateMetadata }` im Catch-all einbinden. */
export async function generateCoreAdminMetadata({ params }: { params: Promise<{ core?: string[] }> }) {
  const { core } = await params;
  const page = core?.[0] ? getCoreAdminPage(core[0]) : undefined;
  return { title: page ? `${page.label} — Admin` : "Admin" };
}

export async function CoreAdminRoute({
  params,
  options,
}: {
  params: Promise<{ core?: string[] }>;
  /** Projektspezifische Angaben, z. B. { einstellungen: { defaultSiteName: "Muster GmbH" } } */
  options?: CoreAdminOptions;
}) {
  const { core } = await params;
  const slug = core?.[0];
  const page = slug ? getCoreAdminPage(slug) : undefined;

  if (!page) {
    return notFound();
  }

  const Component = page.Component;
  return <Component options={options} />;
}
