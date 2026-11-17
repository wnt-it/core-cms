import { Fragment, type ReactNode } from "react";
import { isRichTextHtml, legacyTextToHtml } from "./legacy";
import { isExternalHref, parseRichText, type RichTextNode } from "./sanitize";

// Anzeige von Rich-Text auf der Website. Server- und Client-tauglich, ohne Abhängigkeiten.
// Kein dangerouslySetInnerHTML: Der Text wird eingelesen, auf die erlaubten Elemente
// zurückgeschnitten (sanitize.ts) und als React-Elemente ausgegeben. Älterer Text im
// einfachen Textformat (**fett**, ## Überschrift …) wird automatisch umgewandelt.

export interface RichTextProps {
  /** Gespeicherter Wert: HTML aus dem RichTextEditor oder Text im bisherigen Format. */
  value: string | null | undefined;
  /** Klasse am äußeren Element (Typografie macht das Projekt, z. B. "prose" oder eigene "rich"). */
  className?: string;
  /** Äußeres Element (Standard: div). */
  as?: "div" | "section" | "article";
  /** Externe Links (http/https) in neuem Tab öffnen. Standard: true. */
  externalLinksInNewTab?: boolean;
  /** Bilder ausgeben. Standard: true. */
  images?: boolean;
}

export function richTextNodes(value: string | null | undefined): RichTextNode[] {
  if (!value?.trim()) return [];
  return parseRichText(isRichTextHtml(value) ? value : legacyTextToHtml(value));
}

export function RichText({ value, className, as: Tag = "div", externalLinksInNewTab = true, images = true }: RichTextProps) {
  const nodes = richTextNodes(value);
  if (!nodes.length) return null;
  return <Tag className={className}>{renderNodes(nodes, { externalLinksInNewTab, images })}</Tag>;
}

interface RenderOptions {
  externalLinksInNewTab: boolean;
  images: boolean;
}

function renderNodes(nodes: RichTextNode[], o: RenderOptions): ReactNode[] {
  return nodes.map((n, i) => renderNode(n, i, o));
}

function renderNode(n: RichTextNode, key: number, o: RenderOptions): ReactNode {
  switch (n.type) {
    case "text":
      return <Fragment key={key}>{n.text}</Fragment>;
    case "br":
      return <br key={key} />;
    case "img":
      // eslint-disable-next-line @next/next/no-img-element
      return o.images ? <img key={key} src={n.src} alt={n.alt} loading="lazy" decoding="async" /> : null;
    case "a": {
      const external = isExternalHref(n.href);
      return (
        <a
          key={key}
          href={n.href}
          {...(external ? { rel: "noopener noreferrer", ...(o.externalLinksInNewTab ? { target: "_blank" } : {}) } : {})}
        >
          {renderNodes(n.children, o)}
        </a>
      );
    }
    case "p":
      return <p key={key}>{n.children.length ? renderNodes(n.children, o) : <br />}</p>;
    default: {
      const T = n.type;
      return <T key={key}>{renderNodes(n.children, o)}</T>;
    }
  }
}
