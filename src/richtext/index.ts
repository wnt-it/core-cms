// Rich-Text: Anzeige auf der Website und Bereinigung (ohne Editor, ohne Tiptap).
// Den Editor fürs Admin gibt es separat: import { RichTextEditor } from "core-cms/src/richtext/editor";
// so landet Tiptap nur im Admin-Bundle.
import { toRichTextHtml } from "./legacy";
import { parseRichText, richTextNodesToPlainText } from "./sanitize";

export { RichText, richTextNodes } from "./RichText";
export type { RichTextProps } from "./RichText";
export { isRichTextHtml, legacyTextToHtml, toRichTextHtml } from "./legacy";
export {
  sanitizeRichText,
  parseRichText,
  serializeRichText,
  safeHref,
  safeImageSrc,
  isExternalHref,
  decodeEntities,
  richTextNodesToPlainText,
} from "./sanitize";
export type { RichTextNode } from "./sanitize";

/**
 * Reiner Text ohne Formatierung (HTML oder bisheriges Textformat), z. B. für Vorschauen
 * in Listen oder die meta description. Mit maxLength wird an einer Wortgrenze gekürzt („…“).
 */
export function richTextToPlainText(value: string | null | undefined, maxLength?: number): string {
  const text = richTextNodesToPlainText(parseRichText(toRichTextHtml(value)));
  if (!maxLength || text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > maxLength * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** true, wenn der Wert keinen sichtbaren Inhalt hat (leer, nur Leerzeichen oder leere Absätze). */
export function isRichTextEmpty(value: string | null | undefined): boolean {
  return toRichTextHtml(value) === "";
}
