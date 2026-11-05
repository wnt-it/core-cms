// Öffentliche Seiten /datenschutz und /impressum aus dem Core. Das Projekt legt EINMALIG eine Route an, z. B.
//   app/[legal]/page.tsx
//   export { LegalRoute as default, generateLegalMetadata as generateMetadata, generateLegalStaticParams as generateStaticParams } from "core-cms/src/legal";
//   export const dynamicParams = false;
// Danach kommen Texte, Nummerierung, Inhaltsverzeichnis, Verweise und das Impressum automatisch aus dem Core
// (gepflegt im Admin unter „Datenschutzerklärung“ und „Impressum“). Gestaltung: Standard hier, anpassbar über LegalRouteOptions
// (nur in einer eigenen Route-Datei, nicht beim Re-Export).

import { Fragment, type ComponentType, type ReactNode } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getImpressum } from "./get-impressum";
import { getLegalDocument } from "./get-legal-document";
import { IMPRESSUM_SLUG, impressumToBlocks } from "./impressum";
import {
  groupPolicyBlocks,
  policyAnchor,
  policyToc,
  renumberPolicyBlocks,
  resolvePolicyRefs,
  type LegalDocumentContent,
  type PolicyBlock,
} from "./policy";

export interface LegalPublicPage {
  /** Adresse der Seite: /datenschutz */
  path: string;
  /** Kennung in legal_documents */
  slug: string;
  title: string;
  description: string;
  /** true: nummerierte Überschriften, Inhaltsverzeichnis, Verweise. false: schlichter Text (Impressum). */
  numbered: boolean;
}

/** Alle Seiten, die der Core öffentlich ausliefert. Neue Rechtstexte kommen hier dazu und erscheinen mit dem Versionsupdate. */
export const LEGAL_PUBLIC_PAGES: LegalPublicPage[] = [
  { path: "datenschutz", slug: "datenschutz", title: "Datenschutzerklärung", description: "Informationen zum Umgang mit Ihren personenbezogenen Daten.", numbered: true },
  { path: IMPRESSUM_SLUG, slug: IMPRESSUM_SLUG, title: "Impressum", description: "Pflichtangaben nach § 5 DDG.", numbered: false },
];

export interface LegalWrapperProps {
  title: string;
  /** Fassung (Datum), nur bei Texten mit Fassung. */
  version?: string;
  children: ReactNode;
}

export interface LegalRouteOptions {
  /** Rahmen der Seite (Abstände, Überschrift) im Stil des Projekts. Standard: schlichter Rahmen. */
  Wrapper?: ComponentType<LegalWrapperProps>;
  /** Klassen für Links im Text. */
  linkClassName?: string;
  /** Texte, die gelten, solange in der Datenbank noch nichts steht (z. B. vor der Migration). Ohne Eintrag: Seite nicht gefunden. */
  templates?: { datenschutz?: LegalDocumentContent; impressum?: unknown };
}

type RouteParams = { params: Promise<{ legal?: string | string[] }> };

const pageFor = async ({ params }: RouteParams) => {
  const { legal } = await params;
  const path = Array.isArray(legal) ? (legal.length === 1 ? legal[0] : "") : legal;
  return LEGAL_PUBLIC_PAGES.find((p) => p.path === path);
};

/** Für `generateStaticParams`: beide Seiten werden vorab gebaut und nach dem Speichern im Admin neu aufgebaut. */
export function generateLegalStaticParams() {
  return LEGAL_PUBLIC_PAGES.map((p) => ({ legal: p.path }));
}

export async function generateLegalMetadata(props: RouteParams): Promise<Metadata> {
  const page = await pageFor(props);
  if (!page) return {};
  return { title: page.title, description: page.description, alternates: { canonical: `/${page.path}` } };
}

const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/)/i;
// [Text](Adresse), https://…, **fett** und Platzhalter [● …] (gelb markiert, bis sie gefüllt sind)
const TOKEN = /(\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s]+?(?=[.,;)]?(?:\s|$))|\*\*[^*]+\*\*|\[●[^\]]*\])/g;

function Inline({ text, linkClassName }: { text: string; linkClassName?: string }) {
  const link = (href: string, label: string, key: number) =>
    SAFE_HREF.test(href) ? (
      <a key={key} href={href} className={linkClassName ?? "underline break-words"} {...(/^https?:/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {label}
      </a>
    ) : (
      <Fragment key={key}>{label}</Fragment>
    );
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (i % 2 === 0) {
          // Zeilenumbrüche im Text bleiben erhalten
          return (
            <Fragment key={i}>
              {part.split("\n").map((line, k) => (
                <Fragment key={k}>
                  {k > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </Fragment>
          );
        }
        if (part.startsWith("[●")) return <mark key={i} className="bg-yellow-200 px-1 text-black">{part}</mark>;
        if (part.startsWith("**")) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("[")) {
          const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
          return m ? link(m[2], m[1], i) : <Fragment key={i}>{part}</Fragment>;
        }
        return link(part, part, i);
      })}
    </>
  );
}

const DefaultWrapper = ({ title, version, children }: LegalWrapperProps) => (
  <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
    <h1 className="mb-2 text-3xl font-semibold">{title}</h1>
    {version && <p className="mb-8 opacity-70">Fassung {version}</p>}
    <div className={version ? "" : "mt-8"}>{children}</div>
  </main>
);

function Blocks({ blocks, toc, linkClassName }: { blocks: PolicyBlock[]; toc: boolean; linkClassName?: string }) {
  const groups = groupPolicyBlocks(blocks);
  const isHeading = (g: (typeof groups)[number]) => g.type === "h1" || g.type === "h2" || g.type === "h3";
  const first = groups.findIndex(isHeading);
  // Mit Inhaltsverzeichnis: erst der Text vor der ersten Überschrift, dann das Verzeichnis, dann die Abschnitte
  const split = toc ? (first < 0 ? groups.length : first) : 0;
  const entries = toc ? policyToc(blocks) : [];

  const render = (g: (typeof groups)[number], key: number) => {
    if (g.type === "ul") {
      return (
        <ul key={key} className="list-disc space-y-1 pl-6">
          {g.items.map((item, i) => (
            <li key={i}><Inline text={item} linkClassName={linkClassName} /></li>
          ))}
        </ul>
      );
    }
    if (g.type === "p") return <p key={key} className="leading-relaxed"><Inline text={g.text} linkClassName={linkClassName} /></p>;
    const id = toc ? policyAnchor(g.text) : undefined;
    const cls = g.type === "h1" ? "mt-10 text-2xl font-semibold scroll-mt-24" : g.type === "h2" ? "mt-8 text-xl font-semibold scroll-mt-24" : "mt-6 text-lg font-semibold scroll-mt-24";
    const Tag = g.type === "h1" ? "h2" : g.type === "h2" ? "h3" : "h4";
    return <Tag key={key} id={id} className={cls}>{g.text}</Tag>;
  };

  return (
    <div className="space-y-4">
      {groups.slice(0, split).map(render)}
      {entries.length > 0 && (
        <nav aria-label="Inhaltsverzeichnis" className="my-8">
          <p className="mb-2 font-semibold">Inhaltsverzeichnis</p>
          <ul className="space-y-1">
            {entries.map((e, i) => {
              const id = policyAnchor(e.text);
              return (
                <li key={i} className={e.t === "h2" ? "pl-5" : ""}>
                  {id ? <a href={`#${id}`} className={linkClassName ?? "underline"}>{e.text}</a> : e.text}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      {groups.slice(split).map((g, i) => render(g, split + i))}
    </div>
  );
}

/** Die Seite selbst. Ohne Eintrag in der Datenbank und ohne Vorlage im Projekt: „nicht gefunden“. */
export async function renderLegalPage(props: RouteParams, options: LegalRouteOptions = {}) {
  const page = await pageFor(props);
  if (!page) notFound();
  const Wrapper = options.Wrapper ?? DefaultWrapper;

  if (!page.numbered) {
    const doc = await getImpressum(page.slug, options.templates?.impressum);
    if (!doc.fromDatabase && options.templates?.impressum === undefined) notFound();
    return (
      <Wrapper title={page.title}>
        <Blocks blocks={impressumToBlocks(doc.data)} toc={false} linkClassName={options.linkClassName} />
      </Wrapper>
    );
  }

  const template = options.templates?.[page.slug as "datenschutz"];
  const doc = await getLegalDocument(page.slug, template ?? { title: page.title, version: "", blocks: [] });
  if (doc.blocks.length === 0) notFound();
  // Nummern nach der Stelle im Text setzen (auch bei Vorlagen ohne Nummern), dann Verweise einsetzen
  const blocks = resolvePolicyRefs(renumberPolicyBlocks(doc.blocks));
  return (
    <Wrapper title={doc.title || page.title} version={doc.version || undefined}>
      <Blocks blocks={blocks} toc linkClassName={options.linkClassName} />
    </Wrapper>
  );
}

/** Standard-Route zum Re-Export (ohne eigene Gestaltung). */
export async function LegalRoute(props: RouteParams) {
  return renderLegalPage(props);
}
