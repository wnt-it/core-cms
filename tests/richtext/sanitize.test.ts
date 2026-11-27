// Bereinigung, Umwandlung des alten Textformats und Klartext für Rich-Text-Felder.
import { describe, expect, it } from "vitest";
import {
  isRichTextEmpty,
  isRichTextHtml,
  legacyTextToHtml,
  richTextToPlainText,
  safeHref,
  safeImageSrc,
  sanitizeRichText,
  toRichTextHtml,
} from "../../src/richtext";
import { normalizeLinkInput } from "../../src/richtext/RichTextEditor";

describe("sanitizeRichText", () => {
  it("lässt erlaubte Formatierung unverändert", () => {
    const html = '<h2>Titel</h2><p><strong>fett</strong>, <em>kursiv</em>, <u>unter</u> und <a href="https://example.com/x?a=1&amp;b=2">Link</a></p><ul><li>eins</li><li>zwei</li></ul><ol><li>a</li></ol><h3>Unter</h3><p>Zeile<br>zwei</p>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("entfernt Skripte, Ereignis-Attribute und gefährliche Tags samt Inhalt", () => {
    expect(sanitizeRichText('<p onclick="alert(1)">Hallo<script>alert(1)</script></p>')).toBe("<p>Hallo</p>");
    expect(sanitizeRichText('<p>a<style>p{color:red}</style>b<iframe src="https://x"></iframe>c</p>')).toBe("<p>abc</p>");
    expect(sanitizeRichText('<svg><script>alert(1)</script></svg><p>ok</p>')).toBe("<p>ok</p>");
    expect(sanitizeRichText('<img src=x onerror="alert(1)"><p>ok</p>')).toBe("<p>ok</p>");
    expect(sanitizeRichText("<p>a<!-- <script>alert(1)</script> -->b</p>")).toBe("<p>ab</p>");
    expect(sanitizeRichText('<p style="color:red" class="x">a</p>')).toBe("<p>a</p>");
  });

  it("entfernt Links mit unsicherem Protokoll, der Text bleibt", () => {
    for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "java\tscript:alert(1)", "&#106;avascript:alert(1)", "&#x6A;avascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x", "//evil.example", "/\\evil.example"]) {
      expect(sanitizeRichText(`<p><a href="${href}">klick</a></p>`), href).toBe("<p>klick</p>");
    }
  });

  it("erlaubt http(s), mailto, tel, relative Adressen und Sprungmarken", () => {
    for (const href of ["https://example.com", "http://example.com", "mailto:info@example.com", "tel:+497721123", "/kontakt", "#oben"]) {
      expect(sanitizeRichText(`<p><a href="${href}">x</a></p>`)).toBe(`<p><a href="${href}">x</a></p>`);
    }
  });

  it("entfernt target und rel aus gespeichertem HTML (setzt die Anzeige selbst)", () => {
    expect(sanitizeRichText('<p><a href="https://x.de" target="_blank" rel="opener">x</a></p>')).toBe('<p><a href="https://x.de">x</a></p>');
  });

  it("maskiert Text und Attribute", () => {
    expect(sanitizeRichText("<p>1 &lt; 2 &amp;&amp; &quot;x&quot;</p>")).toBe('<p>1 &lt; 2 &amp;&amp; "x"</p>');
    expect(sanitizeRichText('<p><a href="/a&quot;onmouseover=&quot;x">y</a></p>')).toBe('<p><a href="/a&quot;onmouseover=&quot;x">y</a></p>');
    expect(sanitizeRichText("<p>a < b > c</p>")).toBe("<p>a &lt; b &gt; c</p>");
  });

  it("vereinfacht Tiptap-Listen und Word/Webseiten-Einfügungen", () => {
    expect(sanitizeRichText("<ul><li><p>eins</p></li><li><p>zwei</p></li></ul>")).toBe("<ul><li>eins</li><li>zwei</li></ul>");
    expect(sanitizeRichText('<div><span style="font-weight:bold"><b>Fett</b></span> und <i>kursiv</i></div><div>Zweiter</div>')).toBe("<p><strong>Fett</strong> und <em>kursiv</em></p><p>Zweiter</p>");
    expect(sanitizeRichText("<h1>Groß</h1><h4>Klein</h4>")).toBe("<h2>Groß</h2><h3>Klein</h3>");
    expect(sanitizeRichText("loser Text")).toBe("<p>loser Text</p>");
    expect(sanitizeRichText("<li>ohne Liste</li>")).toBe("<ul><li>ohne Liste</li></ul>");
  });

  it("verschachtelte Listen bleiben erhalten", () => {
    const html = "<ul><li>a<ul><li>a1</li></ul></li><li>b</li></ul>";
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("räumt leere Absätze und leere Formatierung auf", () => {
    expect(sanitizeRichText("<p></p>")).toBe("");
    expect(sanitizeRichText("<p></p><p>a</p><p></p><p></p><p>b</p><p><br></p>")).toBe("<p>a</p><p></p><p>b</p>");
    expect(sanitizeRichText("<p><strong></strong>a</p>")).toBe("<p>a</p>");
    expect(sanitizeRichText("")).toBe("");
    expect(sanitizeRichText(null)).toBe("");
  });

  it("Bilder nur mit https oder relativer Adresse", () => {
    expect(sanitizeRichText('<p><img src="https://x.supabase.co/a.webp" alt="Ein Bild"></p>')).toBe('<p><img src="https://x.supabase.co/a.webp" alt="Ein Bild"></p>');
    expect(sanitizeRichText('<p><img src="http://x.de/a.jpg" alt="">x</p>')).toBe("<p>x</p>");
    expect(sanitizeRichText('<p><img src="data:image/png;base64,AAA" alt="">x</p>')).toBe("<p>x</p>");
  });

  it("verträgt kaputtes HTML", () => {
    expect(sanitizeRichText("<p><strong>offen")).toBe("<p><strong>offen</strong></p>");
    expect(sanitizeRichText("</p></strong>text")).toBe("<p>text</p>");
    expect(sanitizeRichText('<p><a href="https://a.de">eins<a href="https://b.de">zwei</a></p>')).toBe('<p><a href="https://a.de">eins</a><a href="https://b.de">zwei</a></p>');
  });
});

describe("safeHref / safeImageSrc", () => {
  it("prüft das Protokoll", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("")).toBeNull();
    expect(safeImageSrc("/bild.jpg")).toBe("/bild.jpg");
    expect(safeImageSrc("//cdn.example/bild.jpg")).toBeNull();
  });
});

describe("altes Textformat", () => {
  it("erkennt HTML und altes Format", () => {
    expect(isRichTextHtml("<p>x</p>")).toBe(true);
    expect(isRichTextHtml("  <h2>x</h2>")).toBe(true);
    expect(isRichTextHtml("**fett** und <3")).toBe(false);
    expect(isRichTextHtml("## Überschrift")).toBe(false);
  });

  it("wandelt Absätze, Überschriften, Listen, Fett, Kursiv, Links und Bilder um", () => {
    const text = [
      "## Teilnahme",
      "",
      "Erste Zeile\nzweite Zeile mit **fett** und *kursiv*.",
      "",
      "- eins",
      "- zwei mit [Link](https://example.com)",
      "",
      "1. erstens",
      "",
      "2. zweitens",
      "",
      "### Klein",
      "![Plan](https://example.com/plan.jpg)",
      "[böse](javascript:alert(1)) <b>kein html</b>",
    ].join("\n");
    expect(legacyTextToHtml(text)).toBe(
      "<h2>Teilnahme</h2><p>Erste Zeile<br>zweite Zeile mit <strong>fett</strong> und <em>kursiv</em>.</p>" +
        '<ul><li>eins</li><li>zwei mit <a href="https://example.com">Link</a></li></ul>' +
        "<ol><li>erstens</li><li>zweitens</li></ol><h3>Klein</h3>" +
        '<p><img src="https://example.com/plan.jpg" alt="Plan"></p>' +
        "<p>[böse](javascript:alert(1)) &lt;b&gt;kein html&lt;/b&gt;</p>",
    );
  });

  it("reiner Text wird zu Absätzen", () => {
    expect(legacyTextToHtml("Hallo\n\nWelt")).toBe("<p>Hallo</p><p>Welt</p>");
    expect(toRichTextHtml("Hallo")).toBe("<p>Hallo</p>");
    expect(toRichTextHtml("<p>Hallo</p>")).toBe("<p>Hallo</p>");
    expect(toRichTextHtml("  ")).toBe("");
  });
});

describe("Klartext", () => {
  it("liefert Text ohne Formatierung und kürzt an Wortgrenzen", () => {
    expect(richTextToPlainText("<h2>Titel</h2><p>Ein <strong>fetter</strong> Text.</p><ul><li>a</li><li>b</li></ul>")).toBe("Titel Ein fetter Text. a b");
    expect(richTextToPlainText("**Alt** und *kursiv*")).toBe("Alt und kursiv");
    expect(richTextToPlainText("<p>Ein ziemlich langer Satz mit vielen Wörtern</p>", 20)).toBe("Ein ziemlich langer…");
  });

  it("erkennt leeren Inhalt", () => {
    expect(isRichTextEmpty("<p></p>")).toBe(true);
    expect(isRichTextEmpty("<p> &nbsp; </p>")).toBe(true);
    expect(isRichTextEmpty("<p>x</p>")).toBe(false);
  });
});

describe("Link-Eingabe im Editor", () => {
  it("ergänzt Protokolle und lehnt Unsicheres ab", () => {
    expect(normalizeLinkInput("www.city-rondell.de")).toBe("https://www.city-rondell.de");
    expect(normalizeLinkInput("example.com/seite")).toBe("https://example.com/seite");
    expect(normalizeLinkInput("info@example.com")).toBe("mailto:info@example.com");
    expect(normalizeLinkInput("+49 7720 123-45")).toBe("tel:+497720123-45".replace("-", ""));
    expect(normalizeLinkInput("/kontakt")).toBe("/kontakt");
    expect(normalizeLinkInput("javascript:alert(1)")).toBeNull();
    expect(normalizeLinkInput("  ")).toBeNull();
  });
});

describe("Stabilität", () => {
  it("zweimal bereinigen ändert nichts mehr", () => {
    const inputs = [
      '<div><b>a</b><div>b<ul><li>c<p>d</p></li></ul></div></div><p>x<a href="javascript:1">y</a></p>',
      "<p>a&nbsp;&nbsp;b</p><h1>t</h1>lose<li>z</li>",
      legacyTextToHtml("## T\n\n- a\n- b\n\ntext **f**"),
    ];
    for (const html of inputs) {
      const once = sanitizeRichText(html);
      expect(sanitizeRichText(once)).toBe(once);
    }
  });
});
