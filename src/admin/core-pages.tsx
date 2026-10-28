import { notFound } from "next/navigation";
import { Megaphone, Package, UserCircle } from "lucide-react";
import type { ComponentType } from "react";
import { AccountPage } from "../auth";
import VersionPage from "./VersionPage";
import PopupPage from "../popup/PopupPage";

export interface CoreAdminPage {
  /** URL-Segment unter /admin/, z.B. "konto" -> /admin/konto */
  slug: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  Component: ComponentType;
  /** Menügruppe in AdminShell: "content" (Inhalte) oder "system" (Standard). */
  group?: "content" | "system";
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
  { slug: "popup", label: "Pop-up", icon: Megaphone, Component: PopupPage, group: "content" },
  { slug: "konto", label: "Mein Konto", icon: UserCircle, Component: AccountPage },
  { slug: "version", label: "Core-Version", icon: Package, Component: VersionPage },
];

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
}: {
  params: Promise<{ core?: string[] }>;
}) {
  const { core } = await params;
  const slug = core?.[0];
  const page = slug ? getCoreAdminPage(slug) : undefined;

  if (!page) {
    return notFound();
  }

  const Component = page.Component;
  return <Component />;
}
