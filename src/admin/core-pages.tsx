import { notFound } from "next/navigation";
import { FileText, Inbox, Megaphone, Package, ScrollText, Settings, ShieldCheck, UserCircle } from "lucide-react";
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

// Rechtstexte: Seiten /datenschutz und /impressum liefert LegalRoute (siehe legal/LegalRoute.tsx) aus denselben Daten.
const DatenschutzAdminPage = () => <LegalDocumentPage slug="datenschutz" label="Datenschutzerklärung" publicPath="/datenschutz" />;
const ImpressumAdminPage = () => <ImpressumPage slug={IMPRESSUM_SLUG} publicPath="/impressum" />;

/** Projektspezifische Angaben für Core-Seiten, im Catch-all an CoreAdminRoute übergeben (siehe README). */
export interface CoreAdminOptions {
  einstellungen?: EinstellungenOptions;
}

export interface CoreAdminPage {
  /** URL-Segment unter /admin/, z.B. "konto" -> /admin/konto */
  slug: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  Component: ComponentType<{ options?: CoreAdminOptions }>;
  /** Menügruppe in AdminShell: "content" (Inhalte) oder "system" (Standard). */
  group?: "content" | "system";
  /** false: kein eigener Menüpunkt, die Seite ist anders erreichbar (Konto über den Benutzer unten, Version über die Versionsangabe). */
  inMenu?: boolean;
  /** true: steht in der Gruppe ganz oben (in „Inhalte“ nach dem Dashboard /admin), z. B. Posteingang ganz oben unter „System“. */
  top?: boolean;
  /** true: erscheint nur im Menü, wenn das Projekt den Slug in AdminShell `optionalPages` nennt (Feature ist Opt-in). Die Seite selbst ist immer erreichbar. */
  optional?: boolean;
}

/**
 * Zentrale Liste generischer Admin-Seiten aus core-cms. Jedes Kundenprojekt
 * bindet EINMALIG den Catch-all-Route-Stub ein
 * (app/admin/(dashboard)/[...core]/page.tsx -> CoreAdminRoute) und rendert
 * coreAdminPages in seiner Sidebar-Navigation. Ein neuer Eintrag hier landet
 * danach in jedem Projekt automatisch beim nächsten core-cms-Versionsbump,
 * ohne dass im Kundenprojekt eine neue Route-Datei oder ein neuer Nav-Eintrag
 * angelegt werden muss.
 */
export const coreAdminPages: CoreAdminPage[] = [
  { slug: "posteingang", label: "Posteingang", icon: Inbox, Component: () => <AdminSubmissionsPage />, group: "system", top: true },
  { slug: "einstellungen", label: "Einstellungen", icon: Settings, Component: ({ options }) => <SettingsPage options={options?.einstellungen} />, group: "system" },
  { slug: "popup", label: "Pop-up", icon: Megaphone, Component: PopupPage, group: "system" },
  { slug: "datenschutz", label: "Datenschutzerklärung", icon: ScrollText, Component: DatenschutzAdminPage, group: "system" },
  { slug: "impressum", label: "Impressum", icon: FileText, Component: ImpressumAdminPage, group: "system" },
  { slug: "einwilligungen", label: "Einwilligungen", icon: ShieldCheck, Component: ConsentAdminPage, group: "system", optional: true },
  { slug: "konto", label: "Mein Konto", icon: UserCircle, Component: AccountPage, inMenu: false },
  { slug: "version", label: "Core-Version", icon: Package, Component: VersionPage, inMenu: false },
];

/** Frühere Adressen von Core-Seiten. withCoreCms leitet sie um, Projekte dürfen sie nicht selbst belegen. */
export const RETIRED_ADMIN_PATHS: Record<string, string> = { submissions: "posteingang" };

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
