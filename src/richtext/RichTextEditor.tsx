"use client";

// Rich-Text-Editor für längere Textfelder im Admin (Tiptap, nur im Admin-Bundle).
// Werkzeugleiste: Absatz/Überschrift/Zwischenüberschrift, Fett, Kursiv, Unterstrichen, Link,
// Aufzählung, nummerierte Liste, optional Bild aus der Mediathek, Rückgängig/Wiederholen.
// Gespeichert wird bereinigtes HTML (sanitize.ts). Texte im bisherigen Format (**fett** …)
// werden beim Öffnen umgewandelt und beim nächsten Speichern als HTML abgelegt.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { BulletList, ListItem, ListKeymap, OrderedList } from "@tiptap/extension-list";
import { Placeholder, UndoRedo } from "@tiptap/extensions";
import {
  Bold as BoldIcon,
  Heading2,
  Heading3,
  ImagePlus,
  Italic as ItalicIcon,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import MediaLibraryModal from "../media/MediaLibraryModal";
import { cx, hintClass, inputClass } from "../ui/styles";
import { Button } from "../ui/components";
import { toRichTextHtml } from "./legacy";
import { safeHref, safeImageSrc, sanitizeRichText } from "./sanitize";

export interface RichTextEditorProps {
  /** Gespeicherter Wert (HTML oder bisheriges Textformat). Gesteuert zusammen mit onChange. */
  value?: string | null;
  /** Startwert, wenn das Feld nicht gesteuert wird (z. B. Formular mit Server Action). */
  defaultValue?: string | null;
  /** Bekommt bereinigtes HTML; leerer Text ergibt "". */
  onChange?: (html: string) => void;
  /** Name für ein verstecktes Feld mit dem HTML (Formulare mit FormData). */
  name?: string;
  /** Unsichtbare Beschriftung für Screenreader, wenn kein <Field>-Label daneben steht. */
  "aria-label"?: string;
  /** Verknüpft das Feld mit einer sichtbaren Beschriftung (id des Label-Elements). */
  "aria-labelledby"?: string;
  id?: string;
  placeholder?: string;
  /** Überschriften erlauben (H2/H3). Standard: true. */
  headings?: boolean;
  /** Listen erlauben. Standard: true. */
  lists?: boolean;
  /** Knopf „Bild einfügen“ (Mediathek). Standard: false. Vorhandene Bilder bleiben immer erhalten. */
  images?: boolean;
  /** Mindesthöhe des Schreibbereichs in px. Standard: 220. */
  minHeight?: number;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

/** Normalisiert eine eingegebene Link-Adresse: „www.…“ → https, E-Mail → mailto. */
export function normalizeLinkInput(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (/^[^\s@/:]+@[^\s@/]+\.[a-z]{2,}$/i.test(v)) return safeHref(`mailto:${v}`);
  if (/^\+?[\d\s()/-]{6,}$/.test(v)) return safeHref(`tel:${v.replace(/[\s()/-]/g, "")}`);
  if (/^www\./i.test(v) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(v)) return safeHref(`https://${v}`);
  return safeHref(v);
}

const contentClass = cx(
  "outline-none px-3.5 py-3 text-[14.5px] leading-relaxed text-[#0F172A]",
  "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2:first-child]:mt-0",
  "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-[15.5px] [&_h3]:font-semibold [&_h3:first-child]:mt-0",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li_p]:my-0.5",
  "[&_strong]:font-semibold [&_em]:italic [&_u]:underline",
  "[&_a]:text-[#B8480F] [&_a]:underline [&_a]:underline-offset-2",
  "[&_img]:my-2 [&_img]:max-h-72 [&_img]:max-w-full [&_img]:rounded-md [&_img.ProseMirror-selectednode]:outline [&_img.ProseMirror-selectednode]:outline-2 [&_img.ProseMirror-selectednode]:outline-[var(--admin-accent,#F18652)]",
  "[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-[#94A3B8] [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
);

export function RichTextEditor({
  value,
  defaultValue,
  onChange,
  name,
  id,
  placeholder = "Text eingeben …",
  headings = true,
  lists = true,
  images = false,
  minHeight = 220,
  disabled = false,
  invalid = false,
  className,
  ...aria
}: RichTextEditorProps) {
  const controlled = value !== undefined;
  const initial = useRef<string>(toRichTextHtml(controlled ? value : defaultValue));
  const [html, setHtml] = useState(initial.current);
  /** Zuletzt nach außen gemeldeter Wert: verhindert, dass eigene Änderungen den Editor neu laden. */
  const emitted = useRef<string>(initial.current);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    content: initial.current,
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      Bold,
      Italic,
      Underline,
      ...(headings ? [Heading.configure({ levels: [2, 3] })] : []),
      ...(lists ? [BulletList, OrderedList, ListItem, ListKeymap] : []),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        HTMLAttributes: { target: null, rel: null, class: null },
        isAllowedUri: (url) => !!safeHref(url),
        shouldAutoLink: (url) => !!safeHref(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`),
      }),
      Image.configure({ inline: true, allowBase64: false }),
      UndoRedo,
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: {
        class: contentClass,
        style: `min-height:${minHeight}px`,
        role: "textbox",
        "aria-multiline": "true",
        ...(id ? { id } : {}),
        ...(aria["aria-label"] ? { "aria-label": aria["aria-label"] } : {}),
        ...(aria["aria-labelledby"] ? { "aria-labelledby": aria["aria-labelledby"] } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const next = editor.isEmpty ? "" : sanitizeRichText(editor.getHTML());
      if (next === emitted.current) return;
      emitted.current = next;
      setHtml(next);
      onChangeRef.current?.(next);
    },
  });

  // Gesteuerter Wert von außen geändert (z. B. anderer Eintrag geöffnet): Inhalt ersetzen
  useEffect(() => {
    if (!editor || !controlled) return;
    const next = toRichTextHtml(value);
    if (next === emitted.current) return;
    emitted.current = next;
    setHtml(next);
    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, controlled, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div
      className={cx(
        "overflow-hidden rounded-lg border bg-white transition-[border-color,box-shadow] duration-[180ms]",
        invalid ? "border-[#DC2626]" : "border-[#E2E8F0] hover:border-[#CBD5E1]",
        "focus-within:border-[var(--admin-accent,#F18652)] focus-within:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))]",
        disabled && "bg-[#FAFAFC] opacity-70",
        className,
      )}
    >
      {editor ? (
        <Toolbar editor={editor} headings={headings} lists={lists} images={images} disabled={disabled} />
      ) : (
        <div className="h-[45px] border-b border-[#E2E8F0] bg-[#FAFAFC]" />
      )}
      {editor ? <EditorContent editor={editor} /> : <div style={{ minHeight }} aria-hidden />}
      {name && <input type="hidden" name={name} value={html} />}
    </div>
  );
}

/* ---------- Werkzeugleiste ---------- */

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Fokus im Text behalten (sonst springt die Auswahl beim Klick)
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cx(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-[#334155] transition-colors duration-150 outline-none",
        "hover:bg-[#F1F5F9] focus-visible:shadow-[0_0_0_3px_var(--admin-ring,rgba(241,134,82,.22))] disabled:pointer-events-none disabled:opacity-40",
        active && "bg-[#E2E8F0] text-[#0F172A] hover:bg-[#E2E8F0]",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-[#E2E8F0]" />;
}

type Panel = null | { kind: "link" } | { kind: "image"; src: string };

function Toolbar({ editor, headings, lists, images, disabled }: { editor: Editor; headings: boolean; lists: boolean; images: boolean; disabled: boolean }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      ul: e.isActive("bulletList"),
      ol: e.isActive("orderedList"),
      link: e.isActive("link"),
      href: (e.getAttributes("link").href as string | undefined) ?? "",
      empty: e.state.selection.empty,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const [panel, setPanel] = useState<Panel>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const chain = () => editor.chain().focus();
  const off = disabled;

  return (
    <>
      <div role="toolbar" aria-label="Textformat" className="flex flex-wrap items-center gap-0.5 border-b border-[#E2E8F0] bg-[#FAFAFC] px-1.5 py-1.5">
        {headings && (
          <>
            <ToolButton label="Normaler Absatz" active={!s.h2 && !s.h3 && !s.ul && !s.ol} disabled={off} onClick={() => chain().setParagraph().run()}>
              <Pilcrow size={16} />
            </ToolButton>
            <ToolButton label="Überschrift" active={s.h2} disabled={off} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
              <Heading2 size={17} />
            </ToolButton>
            <ToolButton label="Zwischenüberschrift" active={s.h3} disabled={off} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
              <Heading3 size={17} />
            </ToolButton>
            <Divider />
          </>
        )}
        <ToolButton label="Fett (Strg+B)" active={s.bold} disabled={off} onClick={() => chain().toggleBold().run()}>
          <BoldIcon size={16} />
        </ToolButton>
        <ToolButton label="Kursiv (Strg+I)" active={s.italic} disabled={off} onClick={() => chain().toggleItalic().run()}>
          <ItalicIcon size={16} />
        </ToolButton>
        <ToolButton label="Unterstrichen (Strg+U)" active={s.underline} disabled={off} onClick={() => chain().toggleUnderline().run()}>
          <UnderlineIcon size={16} />
        </ToolButton>
        <ToolButton
          label={s.link ? "Link bearbeiten" : "Link einfügen"}
          active={s.link || panel?.kind === "link"}
          disabled={off || (s.empty && !s.link)}
          onClick={() => setPanel(panel?.kind === "link" ? null : { kind: "link" })}
        >
          <Link2 size={16} />
        </ToolButton>
        {s.link && (
          <ToolButton label="Link entfernen" disabled={off} onClick={() => chain().extendMarkRange("link").unsetLink().run()}>
            <Link2Off size={16} />
          </ToolButton>
        )}
        {lists && (
          <>
            <Divider />
            <ToolButton label="Aufzählung" active={s.ul} disabled={off} onClick={() => chain().toggleBulletList().run()}>
              <List size={17} />
            </ToolButton>
            <ToolButton label="Nummerierte Liste" active={s.ol} disabled={off} onClick={() => chain().toggleOrderedList().run()}>
              <ListOrdered size={17} />
            </ToolButton>
          </>
        )}
        {images && (
          <>
            <Divider />
            <ToolButton label="Bild aus der Mediathek einfügen" disabled={off} onClick={() => setMediaOpen(true)}>
              <ImagePlus size={16} />
            </ToolButton>
          </>
        )}
        <span className="ml-auto" />
        <ToolButton label="Rückgängig (Strg+Z)" disabled={off || !s.canUndo} onClick={() => chain().undo().run()}>
          <Undo2 size={16} />
        </ToolButton>
        <ToolButton label="Wiederholen (Strg+Y)" disabled={off || !s.canRedo} onClick={() => chain().redo().run()}>
          <Redo2 size={16} />
        </ToolButton>
      </div>

      {panel?.kind === "link" && (
        <LinkPanel
          key={s.href}
          initial={s.href}
          onCancel={() => {
            setPanel(null);
            editor.commands.focus();
          }}
          onApply={(href) => {
            chain().extendMarkRange("link").setLink({ href }).run();
            setPanel(null);
          }}
        />
      )}
      {panel?.kind === "image" && (
        <ImagePanel
          src={panel.src}
          onCancel={() => setPanel(null)}
          onApply={(alt) => {
            chain().setImage({ src: panel.src, alt }).run();
            setPanel(null);
          }}
        />
      )}
      {images && (
        <MediaLibraryModal
          isOpen={mediaOpen}
          onClose={() => setMediaOpen(false)}
          onSelect={(url) => {
            setMediaOpen(false);
            const src = safeImageSrc(Array.isArray(url) ? url[0] : url);
            if (src) setPanel({ kind: "image", src });
          }}
        />
      )}
    </>
  );
}

function PanelRow({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="border-b border-[#E2E8F0] bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {hint && <p className={cx(hintClass, "mt-1.5")}>{hint}</p>}
    </div>
  );
}

function LinkPanel({ initial, onApply, onCancel }: { initial: string; onApply: (href: string) => void; onCancel: () => void }) {
  const [input, setInput] = useState(initial);
  const [error, setError] = useState(false);
  const fieldId = useId();
  const apply = () => {
    const href = normalizeLinkInput(input);
    if (!href) return setError(true);
    onApply(href);
  };
  return (
    <PanelRow
      hint={
        error ? (
          <span className="text-[#B91C1C]">
            Diese Adresse kann nicht verlinkt werden. Erlaubt sind Webadressen (https://…), E-Mail-Adressen, Telefonnummern und Seiten deiner Website (/…).
          </span>
        ) : (
          "Webadresse, E-Mail-Adresse, Telefonnummer oder Seite deiner Website (z. B. /kontakt). Externe Links öffnen auf der Website in einem neuen Tab."
        )
      }
    >
      <label htmlFor={fieldId} className="text-[13px] font-medium text-[#334155]">
        Link
      </label>
      <input
        id={fieldId}
        autoFocus
        value={input}
        placeholder="https://…"
        aria-invalid={error}
        onChange={(e) => {
          setInput(e.target.value);
          setError(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className={cx(inputClass, "h-8 min-w-0 flex-1 basis-56")}
      />
      <Button size="sm" variant="primary" onClick={apply}>
        Übernehmen
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Abbrechen
      </Button>
    </PanelRow>
  );
}

function ImagePanel({ src, onApply, onCancel }: { src: string; onApply: (alt: string) => void; onCancel: () => void }) {
  const [alt, setAlt] = useState("");
  const fieldId = useId();
  return (
    <PanelRow hint="Kurze Beschreibung, was auf dem Bild zu sehen ist. Wird vorgelesen, wenn jemand das Bild nicht sehen kann.">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-8 w-8 rounded object-cover" />
      <label htmlFor={fieldId} className="text-[13px] font-medium text-[#334155]">
        Bildbeschreibung
      </label>
      <input
        id={fieldId}
        autoFocus
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onApply(alt.trim());
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className={cx(inputClass, "h-8 min-w-0 flex-1 basis-56")}
      />
      <Button size="sm" variant="primary" onClick={() => onApply(alt.trim())}>
        Einfügen
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Abbrechen
      </Button>
    </PanelRow>
  );
}
