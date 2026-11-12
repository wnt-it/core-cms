// Menüdaten der Core-Seiten, ohne die Seiten selbst. AdminShell (Client) braucht nur
// Slug, Name, Symbol und Gruppe. Die Seiten-Komponenten hängt core-pages.tsx (Server) an,
// damit Server-Code, Changelog und Vorlagen nicht im Browser-Bundle landen.

import { FileText, Inbox, Megaphone, Package, ScrollText, Settings, ShieldCheck, UserCircle } from "lucide-react";
import type { ComponentType } from "react";

export interface CoreAdminNavEntry {
  /** URL-Segment unter /admin/, z.B. "konto" -> /admin/konto */
  slug: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  /** Menügruppe in AdminShell: "content" (Inhalte) oder "system" (Standard). */
  group?: "content" | "system";
  /** false: kein eigener Menüpunkt, die Seite ist anders erreichbar (Konto über den Benutzer unten, Version über die Versionsangabe). */
  inMenu?: boolean;
  /** true: steht in der Gruppe ganz oben (in „Inhalte“ nach dem Dashboard /admin), z. B. Posteingang ganz oben unter „System“. */
  top?: boolean;
  /** true: erscheint nur im Menü, wenn das Projekt den Slug in AdminShell `optionalPages` nennt (Feature ist Opt-in). Die Seite selbst ist immer erreichbar. */
  optional?: boolean;
}

export const coreAdminNav: CoreAdminNavEntry[] = [
  { slug: "posteingang", label: "Posteingang", icon: Inbox, group: "system", top: true },
  { slug: "einstellungen", label: "Einstellungen", icon: Settings, group: "system" },
  { slug: "popup", label: "Pop-up", icon: Megaphone, group: "system" },
  { slug: "datenschutz", label: "Datenschutzerklärung", icon: ScrollText, group: "system" },
  { slug: "impressum", label: "Impressum", icon: FileText, group: "system" },
  { slug: "einwilligungen", label: "Einwilligungen", icon: ShieldCheck, group: "system", optional: true },
  { slug: "konto", label: "Mein Konto", icon: UserCircle, inMenu: false },
  { slug: "version", label: "Core-Version", icon: Package, inMenu: false },
];

/** Frühere Adressen von Core-Seiten. withCoreCms leitet sie um, Projekte dürfen sie nicht selbst belegen. */
export const RETIRED_ADMIN_PATHS: Record<string, string> = { submissions: "posteingang" };
