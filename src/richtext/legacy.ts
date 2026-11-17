// Umwandlung der bisherigen Textfelder (einfaches Textformat) in Rich-Text-HTML.
// Unterstützt das Format, das Projekte bisher selbst gerendert haben (z. B. cityrondell RichText.tsx):
//   Leerzeile = neuer Absatz, einfacher Zeilenumbruch bleibt erhalten
//   ## Überschrift, ### Zwischenüberschrift
//   - Aufzählung (auch •), 1. nummerierte Liste
//   **fett**, *kursiv*, __unterstrichen__, [Linktext](https://…), ![Bildbeschreibung](https://…bild.jpg) in eigener Zeile
// Reiner Text ohne Zeichen wird einfach zu Absätzen. Das Ergebnis läuft immer durch sanitizeRichText.

import { safeHref, safeImageSrc, sanitizeRichText } from "./sanitize";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const TOKEN = /(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*)/g;

function inline(text: string): string {
  return text
    .split(TOKEN)
    .map((part, i) => {
      if (i % 2 === 0) return esc(part).replace(/\n/g, "<br>");
      if (part.startsWith("**")) return `<strong>${inline(part.slice(2, -2))}</strong>`;
      if (part.startsWith("__")) return `<u>${inline(part.slice(2, -2))}</u>`;
      if (part.startsWith("*")) return `<em>${inline(part.slice(1, -1))}</em>`;
      const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const href = m ? safeHref(m[2]) : null;
      if (!m || !href) return esc(part);
      return `<a href="${esc(href)}">${inline(m[1])}</a>`;
    })
    .join("");
}

/** Erkennt gespeichertes Rich-Text-HTML (sonst: bisheriges Textformat). */
export function isRichTextHtml(value: string | null | undefined): boolean {
  return !!value && /^\s*<(p|h[1-6]|ul|ol|li|div|blockquote|strong|em|b|i|u|a|br|img|span)[\s>/]/i.test(value);
}

/** Text im bisherigen Format in Rich-Text-HTML umwandeln (bereinigt). */
export function legacyTextToHtml(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  const out: string[] = [];
  let list: { t: "ul" | "ol"; items: string[] } | null = null;
  const closeList = () => {
    if (list) out.push(`<${list.t}>${list.items.map((it) => `<li>${inline(it)}</li>`).join("")}</${list.t}>`);
    list = null;
  };

  for (const raw of text.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const chunk = raw.trim();
    if (!chunk) continue;
    let para: string[] = [];
    const flush = () => {
      if (para.length) {
        closeList();
        out.push(`<p>${inline(para.join("\n"))}</p>`);
      }
      para = [];
    };
    for (const line of chunk.split("\n")) {
      const img = line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
      const h = line.match(/^(#{1,6})\s+(.+)$/);
      const ul = line.match(/^\s*[-•*]\s+(.+)$/);
      const ol = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (img) {
        flush();
        closeList();
        const src = safeImageSrc(img[2]);
        if (src) out.push(`<p><img src="${esc(src)}" alt="${esc(img[1])}"></p>`);
      } else if (h) {
        flush();
        closeList();
        out.push(h[1].length <= 2 ? `<h2>${inline(h[2])}</h2>` : `<h3>${inline(h[2])}</h3>`);
      } else if (ul || ol) {
        flush();
        const t = ul ? "ul" : "ol";
        // Listen gleicher Art, nur durch Leerzeilen getrennt, bleiben eine Liste
        if (list && list.t !== t) closeList();
        if (!list) list = { t, items: [] };
        list.items.push((ul ?? ol)![1]);
      } else {
        para.push(line);
      }
    }
    flush();
  }
  closeList();
  return sanitizeRichText(out.join(""));
}

/**
 * Gespeicherten Wert in bereinigtes HTML bringen, egal ob schon HTML oder noch im alten
 * Textformat. Für Anzeige und Editor; bestehende Texte werden beim nächsten Speichern zu HTML.
 */
export function toRichTextHtml(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return isRichTextHtml(value) ? sanitizeRichText(value) : legacyTextToHtml(value);
}
