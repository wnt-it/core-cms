// Bereinigung von Rich-Text (HTML) aus dem Admin. Ohne DOM und ohne Abhängigkeiten, läuft
// auf dem Server, im Browser und in Tests gleich. Erlaubt ist nur eine feste Liste:
//   Blöcke:  p, h2, h3, ul, ol, li
//   Inline:  strong, em, u, a (nur href), br, img (nur src, alt)
// Alles andere wird entfernt: unbekannte Tags verschwinden, ihr Text bleibt (z. B. span, div,
// font aus Word), gefährliche Tags samt Inhalt (script, style, iframe, svg …). Attribute außer
// href/src/alt gibt es nicht, also auch kein style, class, on…-Handler.
// Links nur mit http(s), mailto, tel, relativ (/…) oder Sprungmarke (#…). Bilder nur https oder relativ.

export type RichTextInlineTag = "strong" | "em" | "u" | "a";
export type RichTextBlockTag = "p" | "h2" | "h3" | "ul" | "ol" | "li";

export type RichTextNode =
  | { type: "text"; text: string }
  | { type: "br" }
  | { type: "img"; src: string; alt: string }
  | { type: "a"; href: string; children: RichTextNode[] }
  | { type: Exclude<RichTextInlineTag, "a"> | RichTextBlockTag; children: RichTextNode[] };

type ElementNode = Extract<RichTextNode, { children: RichTextNode[] }>;
type ElementTag = ElementNode["type"];

const BLOCK: ReadonlySet<string> = new Set(["p", "h2", "h3", "ul", "ol", "li"]);
const INLINE: ReadonlySet<string> = new Set(["strong", "em", "u", "a"]);

/** Umbenennungen beim Einlesen (Word, ältere Editoren, eingefügte Webseiten). */
const ALIAS: Record<string, string> = { b: "strong", i: "em", h1: "h2", h4: "h3", h5: "h3", h6: "h3", ins: "u" };

/** Diese Tags fliegen mit ihrem ganzen Inhalt raus. */
const DROP_WITH_CONTENT: ReadonlySet<string> = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template", "textarea", "select",
  "option", "button", "svg", "math", "head", "title", "frameset", "frame", "applet", "xml",
]);

/** Blockartige fremde Tags beenden den laufenden Absatz (Text wird nicht zusammengeklebt). */
const FOREIGN_BLOCK: ReadonlySet<string> = new Set([
  "div", "section", "article", "header", "footer", "main", "aside", "nav", "blockquote", "pre",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "figure", "figcaption", "address", "dl", "dt", "dd", "hr",
]);

/* ---------- Adressen ---------- */

// Steuerzeichen und Leerraum entfernen, bevor das Protokoll geprüft wird („java\tscript:“, „ javascript:“).
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0020\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\ufeff]/g;
const SAFE_HREF = /^(https?:\/\/[^/\\]|mailto:[^\s]|tel:[+\d(]|\/(?![/\\])|#)/i;
const SAFE_SRC = /^(https:\/\/[^/\\]|\/(?![/\\]))/i;

/** Link-Adresse prüfen. Gibt die bereinigte Adresse zurück oder null, wenn sie nicht erlaubt ist. */
export function safeHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  const probe = v.replace(CONTROL, "");
  if (!probe || probe.length > 2000 || !SAFE_HREF.test(probe)) return null;
  return v.replace(CONTROL, (c) => (c === " " ? "%20" : ""));
}

/** Bild-Adresse prüfen (nur https oder relativ zur eigenen Website). */
export function safeImageSrc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().replace(CONTROL, "");
  if (!v || v.length > 2000 || !SAFE_SRC.test(v)) return null;
  return v;
}

/** Link öffnet ein anderes Fenster (Adresse mit http/https). */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/* ---------- Zeichen-Entitäten ---------- */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß",
  eacute: "é", egrave: "è", agrave: "à", aacute: "á", ccedil: "ç", Eacute: "É",
  euro: "€", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»",
  bdquo: "„", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", sbquo: "‚",
  copy: "©", reg: "®", trade: "™", shy: "\u00ad", middot: "·", bull: "•", deg: "°", times: "×",
  sect: "§", para: "¶", frac12: "½", sup2: "²", sup3: "³", rarr: "→", larr: "←",
};

export function decodeEntities(s: string): string {
  if (!s.includes("&")) return s;
  return s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z][a-z0-9]{1,31});?/gi, (m, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return "�";
      return String.fromCodePoint(code);
    }
    return Object.prototype.hasOwnProperty.call(NAMED, body) ? NAMED[body] : m;
  });
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, "&quot;");
}

/* ---------- Einlesen ---------- */

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/y;
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function readAttrs(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of src.matchAll(ATTR)) {
    const name = m[1].toLowerCase();
    if (!(name in out)) out[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

interface Frame {
  node: ElementNode | { type: "root"; children: RichTextNode[] };
}

/**
 * HTML einlesen und auf die erlaubten Elemente zurückschneiden. Ergebnis ist ein Baum,
 * der direkt gerendert (RichText) oder wieder zu HTML gemacht werden kann (sanitizeRichText).
 */
export function parseRichText(html: string | null | undefined): RichTextNode[] {
  const root = { type: "root" as const, children: [] as RichTextNode[] };
  if (!html) return [];
  const input = html.length > 500_000 ? html.slice(0, 500_000) : html;
  const stack: Frame[] = [{ node: root }];
  const helper = new WeakSet<object>();
  const top = () => stack[stack.length - 1].node;
  const has = (t: string) => stack.some((f) => f.node.type === t);

  const closeTo = (t: string) => {
    for (let i = stack.length - 1; i > 0; i--) {
      if (stack[i].node.type === t) {
        stack.length = i;
        return true;
      }
    }
    return false;
  };
  /** Laufende Inline-Elemente und Absätze/Überschriften schließen (vor einem neuen Block). */
  const closeInlineAndText = () => {
    while (stack.length > 1) {
      const t = top().type;
      if (t === "ul" || t === "ol" || t === "li") break;
      stack.pop();
    }
  };
  const push = (node: ElementNode) => {
    top().children.push(node);
    stack.push({ node });
  };
  const text = (s: string) => {
    if (!s) return;
    const kids = top().children;
    const last = kids[kids.length - 1];
    if (last && last.type === "text") last.text += s;
    else kids.push({ type: "text", text: s });
  };

  let i = 0;
  while (i < input.length) {
    const lt = input.indexOf("<", i);
    if (lt === -1) {
      text(decodeEntities(input.slice(i)));
      break;
    }
    if (lt > i) text(decodeEntities(input.slice(i, lt)));
    i = lt;

    if (input.startsWith("<!--", i)) {
      const end = input.indexOf("-->", i + 4);
      i = end === -1 ? input.length : end + 3;
      continue;
    }
    if (input.startsWith("<!", i) || input.startsWith("<?", i)) {
      const end = input.indexOf(">", i);
      i = end === -1 ? input.length : end + 1;
      continue;
    }

    TAG.lastIndex = i;
    const m = TAG.exec(input);
    if (!m) {
      // Kein gültiges Tag: „<“ als Zeichen behandeln
      text("<");
      i += 1;
      continue;
    }
    i = TAG.lastIndex;
    const closing = m[1] === "/";
    const raw = m[2].toLowerCase();
    const tag = ALIAS[raw] ?? raw;

    if (DROP_WITH_CONTENT.has(raw)) {
      if (!closing && !m[4]) {
        const close = new RegExp(`</${raw}\\s*>`, "ig");
        close.lastIndex = i;
        const c = close.exec(input);
        i = c ? close.lastIndex : input.length;
      }
      continue;
    }

    if (closing) {
      if (BLOCK.has(tag) || INLINE.has(tag)) closeTo(tag);
      else if (FOREIGN_BLOCK.has(raw)) closeInlineAndText();
      continue;
    }

    const attrs = readAttrs(m[3] ?? "");

    if (tag === "br") {
      top().children.push({ type: "br" });
      continue;
    }
    if (tag === "img") {
      const src = safeImageSrc(attrs.src);
      if (src) top().children.push({ type: "img", src, alt: (attrs.alt ?? "").slice(0, 500) });
      continue;
    }
    if (tag === "p" || tag === "h2" || tag === "h3") {
      closeInlineAndText();
      // Text direkt in einer Liste gehört in einen Listenpunkt
      const t = top().type;
      if (t === "ul" || t === "ol") push({ type: "li", children: [] });
      push({ type: tag, children: [] });
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      closeInlineAndText();
      const t = top().type;
      if (t === "ul" || t === "ol") push({ type: "li", children: [] });
      push({ type: tag, children: [] });
      continue;
    }
    if (tag === "li") {
      if (!has("ul") && !has("ol")) {
        closeInlineAndText();
        push({ type: "ul", children: [] });
      } else {
        // bis zur nächsten Liste schließen (vorherigen Listenpunkt beenden)
        while (stack.length > 1 && top().type !== "ul" && top().type !== "ol") stack.pop();
      }
      push({ type: "li", children: [] });
      continue;
    }
    if (tag === "a") {
      if (has("a")) closeTo("a"); // keine verschachtelten Links
      const href = safeHref(attrs.href);
      // Link ohne erlaubte Adresse: nur der Text bleibt (Frame ohne Ausgabe)
      if (href) push({ type: "a", href, children: [] });
      continue;
    }
    if (tag === "strong" || tag === "em" || tag === "u") {
      push({ type: tag, children: [] });
      continue;
    }
    if (FOREIGN_BLOCK.has(raw)) {
      // div & Co. (eingefügt aus Word oder Webseiten) werden zu Absätzen
      closeInlineAndText();
      const t = top().type;
      if (t === "root" || t === "li") {
        const p: ElementNode = { type: "p", children: [] };
        helper.add(p);
        push(p);
      }
      continue;
    }
    // Unbekanntes Tag (span, font, …): weglassen, Inhalt bleibt
  }

  return normalize(dropEmptyHelpers(root.children, helper), "root");
}

/** Vom Parser angelegte Hilfsabsätze, die leer geblieben sind, spurlos entfernen. */
function dropEmptyHelpers(nodes: RichTextNode[], helper: WeakSet<object>): RichTextNode[] {
  return nodes.flatMap((n): RichTextNode[] => {
    if (!("children" in n)) return [n];
    const children = dropEmptyHelpers(n.children, helper);
    if (helper.has(n) && !hasContent(children)) return [];
    return [{ ...n, children } as ElementNode];
  });
}

/* ---------- Aufräumen ---------- */

function isInline(n: RichTextNode): boolean {
  return n.type === "text" || n.type === "br" || n.type === "img" || INLINE.has(n.type);
}

function hasContent(nodes: RichTextNode[]): boolean {
  return nodes.some((n) =>
    n.type === "text" ? n.text.replace(/[\s\u00a0]/g, "") !== "" : n.type === "img" ? true : n.type === "br" ? false : hasContent(n.children),
  );
}

/** Leere Inline-Elemente entfernen, Blöcke in Absätze/Listen ordnen, Ränder säubern. */
function normalize(nodes: RichTextNode[], parent: ElementTag | "root"): RichTextNode[] {
  const out: RichTextNode[] = [];
  for (const n of nodes) {
    if (n.type === "text" || n.type === "br" || n.type === "img") {
      out.push(n);
      continue;
    }
    const children = normalize(n.children, n.type);
    if (INLINE.has(n.type)) {
      if (!hasContent(children) && !children.some((c) => c.type === "br")) continue;
      out.push({ ...n, children } as ElementNode);
      continue;
    }
    out.push({ ...n, children } as ElementNode);
  }

  if (parent === "root") {
    // Lose Inline-Inhalte zu Absätzen zusammenfassen
    const grouped: RichTextNode[] = [];
    let run: RichTextNode[] = [];
    const flush = () => {
      if (hasContent(run)) grouped.push({ type: "p", children: trimInline(run) });
      run = [];
    };
    for (const n of out) {
      if (isInline(n)) run.push(n);
      else {
        flush();
        grouped.push(n.type === "li" ? { type: "ul", children: [n] } : n);
      }
    }
    flush();
    return trimEmptyBlocks(grouped);
  }

  if (parent === "li") {
    // Listenpunkt: Text direkt, ohne Absatz-Hülle (Tiptap liefert <li><p>…</p></li>).
    // Mehrere Absätze werden mit Zeilenumbruch getrennt, verschachtelte Listen bleiben.
    const flat: RichTextNode[] = [];
    let run: RichTextNode[] = [];
    const flush = () => {
      if (hasContent(run)) {
        const last = flat[flat.length - 1];
        if (last && isInline(last)) flat.push({ type: "br" });
        flat.push(...trimInline(run));
      }
      run = [];
    };
    for (const n of out) {
      if (isInline(n)) run.push(n);
      else if (n.type === "p" || n.type === "h2" || n.type === "h3") {
        flush();
        run.push(...n.children);
        flush();
      } else {
        flush();
        flat.push(n);
      }
    }
    flush();
    return flat;
  }

  if (parent === "ul" || parent === "ol") {
    // In Listen nur Listenpunkte; lose Inhalte werden zu einem Punkt, leere fallen weg
    const items: RichTextNode[] = [];
    let run: RichTextNode[] = [];
    const flush = () => {
      if (hasContent(run)) items.push({ type: "li", children: trimInline(run) });
      run = [];
    };
    for (const n of out) {
      if (n.type === "li") {
        flush();
        if (hasContent(n.children)) items.push(n);
      } else if (n.type === "ul" || n.type === "ol") {
        // verschachtelte Liste ohne Listenpunkt: an den vorigen Punkt hängen
        flush();
        const prev = items[items.length - 1];
        if (prev && prev.type === "li") prev.children.push(n);
        else items.push({ type: "li", children: [n] });
      } else if (n.type === "p" || n.type === "h2" || n.type === "h3") {
        flush();
        if (hasContent(n.children)) items.push({ type: "li", children: n.children });
      } else run.push(n);
    }
    flush();
    return items;
  }

  if (parent === "p" || parent === "h2" || parent === "h3") {
    // Blöcke in Absätzen gibt es nicht (der Parser verhindert es), zur Sicherheit flach machen
    return trimInline(out.flatMap((n) => (isInline(n) ? [n] : "children" in n ? n.children : [])));
  }
  return out;
}

/** Leerraum und Zeilenumbrüche am Anfang und Ende eines Absatzes entfernen. */
function trimInline(nodes: RichTextNode[]): RichTextNode[] {
  const list = [...nodes];
  while (list.length && (list[0].type === "br" || (list[0].type === "text" && !list[0].text.trim()))) list.shift();
  while (list.length) {
    const last = list[list.length - 1];
    if (last.type === "br" || (last.type === "text" && !last.text.trim())) list.pop();
    else break;
  }
  if (list[0]?.type === "text") list[0] = { type: "text", text: list[0].text.replace(/^[ \t\r\n]+/, "") };
  const l = list.length - 1;
  if (list[l]?.type === "text") list[l] = { type: "text", text: (list[l] as { text: string }).text.replace(/[ \t\r\n]+$/, "") };
  // Zeilenumbrüche im Quelltext sind kein Umbruch im Text
  return list.map((n) => (n.type === "text" ? { type: "text", text: n.text.replace(/[ \t]*[\r\n]+[ \t]*/g, " ") } : n));
}

/** Leere Absätze am Anfang und Ende weglassen, mehrere leere hintereinander auf einen kürzen. */
function trimEmptyBlocks(blocks: RichTextNode[]): RichTextNode[] {
  const empty = (n: RichTextNode) => (n.type === "p" || n.type === "h2" || n.type === "h3") && !hasContent(n.children);
  const out: RichTextNode[] = [];
  for (const b of blocks) {
    if (empty(b) && (out.length === 0 || empty(out[out.length - 1]))) continue;
    out.push(b);
  }
  while (out.length && empty(out[out.length - 1])) out.pop();
  return out;
}

/* ---------- Ausgabe ---------- */

export function serializeRichText(nodes: RichTextNode[]): string {
  return nodes.map(serializeNode).join("");
}

function serializeNode(n: RichTextNode): string {
  switch (n.type) {
    case "text":
      return escapeText(n.text);
    case "br":
      return "<br>";
    case "img":
      return `<img src="${escapeAttr(n.src)}" alt="${escapeAttr(n.alt)}">`;
    case "a":
      return `<a href="${escapeAttr(n.href)}">${serializeRichText(n.children)}</a>`;
    default:
      return `<${n.type}>${serializeRichText(n.children)}</${n.type}>`;
  }
}

/**
 * HTML auf die erlaubten Elemente zurückschneiden. Immer vor dem Speichern auf dem Server
 * aufrufen (der Browser kann beliebiges schicken). Leerer Text ergibt "".
 */
export function sanitizeRichText(html: string | null | undefined): string {
  return serializeRichText(parseRichText(html));
}

/** Reiner Text ohne Formatierung, z. B. für Vorschauen und Beschreibungen (meta description). */
export function richTextNodesToPlainText(nodes: RichTextNode[]): string {
  const parts: string[] = [];
  const walk = (list: RichTextNode[]) => {
    for (const n of list) {
      if (n.type === "text") parts.push(n.text);
      else if (n.type === "br") parts.push(" ");
      else if (n.type === "img") continue;
      else {
        if (BLOCK.has(n.type)) parts.push(" ");
        walk(n.children);
        if (BLOCK.has(n.type)) parts.push(" ");
      }
    }
  };
  walk(nodes);
  return parts.join("").replace(/[\s\u00a0]+/g, " ").trim();
}
