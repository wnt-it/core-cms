// Impressum als Formular (Pflichtangaben nach § 5 DDG) statt als freier Text.
// Reine Daten und Funktionen ohne React und ohne Server-Zugriff: Editor (Client), Speichern (Server) und
// Website nutzen dasselbe Schema. Impressen sind weitgehend gleich, deshalb gibt der Core die Felder vor.

import type { PolicyBlock } from "./policy";

/** Feste Kennung des Impressums in legal_documents. Es hat eigene Spalten (data) und darf nie als freier Text gespeichert werden. */
export const IMPRESSUM_SLUG = "impressum";

/** Gesetzestext: https://www.gesetze-im-internet.de/ddg/__5.html */
export const DDG_5_URL = "https://www.gesetze-im-internet.de/ddg/__5.html";

export interface ImpressumField {
  id: string;
  label: string;
  type?: "text" | "textarea";
  /** Pflichtfeld, sobald der Abschnitt zutrifft. */
  required?: boolean;
  hint?: string;
  placeholder?: string;
}

export interface ImpressumSection {
  id: string;
  title: string;
  /** Exakte Gesetzesstelle, z. B. „§ 5 Abs. 1 Nr. 4 DDG“. */
  law: string;
  description: string;
  /** Wenn gesetzt, kann der Abschnitt als „nicht anwendbar“ markiert werden (Wert = Voreinstellung bei leerem Impressum). */
  naByDefault?: boolean;
  fields: ImpressumField[];
  /** Text für die Website; leere Zeilen und leere Felder entfallen. */
  render: (v: Record<string, string>) => PolicyBlock[];
}

/** Zeilen ohne leere Einträge zu einem Absatz. */
const lines = (...parts: Array<string | undefined>) => parts.map((p) => (p ?? "").trim()).filter(Boolean).join("\n");
const p = (text: string): PolicyBlock[] => (text ? [{ t: "p", text }] : []);
const withHeading = (heading: string, text: string): PolicyBlock[] => (text ? [{ t: "h2", text: heading }, { t: "p", text }] : []);

export const IMPRESSUM_SECTIONS: ImpressumSection[] = [
  {
    id: "anbieter",
    title: "Anbieter",
    law: "§ 5 Abs. 1 Nr. 1 DDG",
    description: "Name und Anschrift, an der der Anbieter niedergelassen ist. Bei juristischen Personen zusätzlich die Rechtsform (im Namen enthalten, z. B. „Muster GmbH“) und die Vertretungsberechtigten.",
    fields: [
      { id: "name", label: "Name bzw. Firma (mit Rechtsform)", required: true, placeholder: "Muster GmbH" },
      { id: "subtitle", label: "Zusatz unter dem Namen", hint: "z. B. ein Untertitel oder Geschäftsbereich." },
      { id: "street", label: "Straße und Hausnummer", required: true },
      { id: "zip", label: "Postleitzahl", required: true },
      { id: "city", label: "Ort", required: true },
      { id: "representatives", label: "Vertretungsberechtigte", hint: "Pflicht bei juristischen Personen (z. B. GmbH), z. B. „Geschäftsführer Max Mustermann“. Bei Einzelunternehmen leer lassen." },
    ],
    render: (v) => [
      ...p(lines(v.name, v.subtitle, v.street, [v.zip, v.city].filter(Boolean).join(" "))),
      ...p(v.representatives ? `Vertreten durch: ${v.representatives.trim()}` : ""),
    ],
  },
  {
    id: "kapital",
    title: "Kapital",
    law: "§ 5 Abs. 1 Nr. 1 DDG (letzter Halbsatz)",
    description: "Nur anzugeben, wenn auf der Website Angaben zum Stamm- oder Grundkapital gemacht werden (dann auch ausstehende Einlagen).",
    naByDefault: true,
    fields: [{ id: "capital", label: "Stamm- bzw. Grundkapital", required: true, placeholder: "25.000 EUR, davon eingezahlt 25.000 EUR" }],
    render: (v) => p(v.capital ? `Stammkapital: ${v.capital.trim()}` : ""),
  },
  {
    id: "kontakt",
    title: "Kontakt",
    law: "§ 5 Abs. 1 Nr. 2 DDG",
    description: "Angaben für eine schnelle elektronische Kontaktaufnahme und unmittelbare Kommunikation, einschließlich der E-Mail-Adresse. Ein Kontaktformular allein reicht nicht aus. Eine Telefonnummer wird empfohlen.",
    fields: [
      { id: "email", label: "E-Mail-Adresse", required: true },
      { id: "phone", label: "Telefon", hint: "Empfohlen, damit eine unmittelbare Kommunikation möglich ist." },
      { id: "fax", label: "Telefax" },
    ],
    render: (v) => p(lines(v.phone && `Telefon: ${v.phone.trim()}`, v.fax && `Telefax: ${v.fax.trim()}`, v.email && `E-Mail: ${v.email.trim()}`)),
  },
  {
    id: "aufsicht",
    title: "Zulassung und Aufsichtsbehörde",
    law: "§ 5 Abs. 1 Nr. 3 DDG",
    description: "Nur bei einer Tätigkeit, die einer behördlichen Zulassung bedarf (z. B. Erlaubnis nach § 34c GewO): die zuständige Aufsichtsbehörde. Üblich ist, auch die erlaubniserteilende Behörde zu nennen.",
    naByDefault: true,
    fields: [
      { id: "permit", label: "Erlaubnis bzw. Zulassung und erteilende Behörde", type: "textarea", placeholder: "Erlaubnis gemäß § 34c GewO erteilt durch:\nLandratsamt …\nStraße\nPLZ Ort", hint: "Optional, wenn nur die Aufsichtsbehörde genannt werden soll." },
      { id: "authority", label: "Zuständige Aufsichtsbehörde (Name und Anschrift)", type: "textarea", required: true, placeholder: "Industrie- und Handelskammer …\nStraße\nPLZ Ort" },
    ],
    render: (v) => [...withHeading("Erlaubnis / Zulassung:", lines(v.permit)), ...withHeading("Aufsichtsbehörde:", lines(v.authority))],
  },
  {
    id: "register",
    title: "Registereintrag",
    law: "§ 5 Abs. 1 Nr. 4 DDG",
    description: "Register, in das der Anbieter eingetragen ist (Handels-, Vereins-, Partnerschafts- oder Genossenschaftsregister), und die Registernummer.",
    naByDefault: true,
    fields: [
      { id: "type", label: "Register", required: true, placeholder: "Handelsregister" },
      { id: "court", label: "Registergericht", required: true, placeholder: "Amtsgericht Ulm" },
      { id: "number", label: "Registernummer", required: true, placeholder: "HRB 123456" },
    ],
    render: (v) => withHeading("Registereintrag:", lines(v.type && `Eintragung im ${v.type.trim()}.`, v.court && `Registergericht: ${v.court.trim()}`, v.number && `Registernummer: ${v.number.trim()}`)),
  },
  {
    id: "berufsrecht",
    title: "Reglementierter Beruf",
    law: "§ 5 Abs. 1 Nr. 5 DDG",
    description: "Nur wenn der Dienst in Ausübung eines reglementierten Berufs angeboten wird (z. B. Rechtsanwalt, Steuerberater, Architekt): Kammer, Berufsbezeichnung samt Verleihungsstaat und die berufsrechtlichen Regelungen mit Fundstelle.",
    naByDefault: true,
    fields: [
      { id: "chamber", label: "Zuständige Kammer", required: true },
      { id: "title", label: "Gesetzliche Berufsbezeichnung", required: true },
      { id: "state", label: "Staat, in dem die Berufsbezeichnung verliehen wurde", required: true, placeholder: "Bundesrepublik Deutschland" },
      { id: "rules", label: "Berufsrechtliche Regelungen und wo sie zugänglich sind", type: "textarea", required: true },
    ],
    render: (v) =>
      withHeading(
        "Berufsrechtliche Angaben:",
        lines(v.chamber && `Kammer: ${v.chamber.trim()}`, v.title && `Berufsbezeichnung: ${v.title.trim()}${v.state ? ` (verliehen in: ${v.state.trim()})` : ""}`, v.rules && `Berufsrechtliche Regelungen: ${v.rules.trim()}`),
      ),
  },
  {
    id: "steuer",
    title: "Umsatzsteuer- bzw. Wirtschafts-Identifikationsnummer",
    law: "§ 5 Abs. 1 Nr. 6 DDG",
    description: "Die Umsatzsteuer-Identifikationsnummer nach § 27a UStG oder die Wirtschafts-Identifikationsnummer nach § 139c AO, sofern vorhanden. Die Steuernummer ist nicht gemeint.",
    naByDefault: false,
    fields: [
      { id: "vatId", label: "Umsatzsteuer-Identifikationsnummer", hint: "z. B. DE123456789. Mindestens eine der beiden Nummern angeben.", placeholder: "DE123456789" },
      { id: "wId", label: "Wirtschafts-Identifikationsnummer", placeholder: "DE123456789-00001" },
    ],
    render: (v) => p(lines(v.vatId && `Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${v.vatId.trim()}`, v.wId && `Wirtschafts-Identifikationsnummer gemäß § 139c AO: ${v.wId.trim()}`)),
  },
  {
    id: "abwicklung",
    title: "Abwicklung oder Liquidation",
    law: "§ 5 Abs. 1 Nr. 7 DDG",
    description: "Nur bei einer Aktiengesellschaft, Kommanditgesellschaft auf Aktien oder GmbH, die sich in Abwicklung oder Liquidation befindet: ein Hinweis darauf.",
    naByDefault: true,
    fields: [{ id: "text", label: "Hinweis", required: true, placeholder: "Die Gesellschaft befindet sich in Liquidation." }],
    render: (v) => p(lines(v.text)),
  },
  {
    id: "redaktion",
    title: "Verantwortlich für journalistisch-redaktionelle Inhalte",
    law: "§ 18 Abs. 2 MStV (weitergehende Pflicht nach § 5 Abs. 2 DDG)",
    description: "Nur bei Inhalten, die journalistisch-redaktionell gestaltet sind (z. B. ein News- oder Blogbereich mit redaktionellen Beiträgen): Name und Anschrift der verantwortlichen Person.",
    naByDefault: true,
    fields: [
      { id: "name", label: "Name der verantwortlichen Person", required: true },
      { id: "address", label: "Anschrift", type: "textarea", required: true },
    ],
    render: (v) => withHeading("Verantwortlich für journalistisch-redaktionelle Inhalte (§ 18 Abs. 2 MStV):", lines(v.name, v.address)),
  },
  {
    id: "streit",
    title: "Verbraucherstreitbeilegung",
    law: "§ 36 VSBG (weitergehende Pflicht nach § 5 Abs. 2 DDG)",
    description: "Nur bei Verbraucherverträgen: Hinweis, ob der Anbieter bereit oder verpflichtet ist, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (Pflicht bei mehr als zehn Beschäftigten).",
    naByDefault: true,
    fields: [
      { id: "text", label: "Hinweistext", type: "textarea", required: true, placeholder: "Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen." },
    ],
    render: (v) => withHeading("Verbraucherstreitbeilegung:", lines(v.text)),
  },
  {
    id: "hinweise",
    title: "Weitere Hinweise",
    law: "freiwillig, keine gesetzliche Pflichtangabe",
    description: "Optionale Texte unter dem Impressum, z. B. Haftung für Links und Urheberrecht. Beide Felder sind frei und können einzeln leer bleiben.",
    naByDefault: true,
    fields: [
      { id: "links", label: "Haftung für Links", type: "textarea" },
      { id: "copyright", label: "Urheberrecht", type: "textarea" },
    ],
    render: (v) => [...withHeading("Haftung für Links", lines(v.links)), ...withHeading("Urheberrecht", lines(v.copyright))],
  },
];

/** Stand je Abschnitt: na = „nicht anwendbar“, v = Werte der Felder. */
export type ImpressumData = Record<string, { na: boolean; v: Record<string, string> }>;

/** Füllt alle Abschnitte und Felder auf; unbekannte Eingaben werden verworfen. */
export function normalizeImpressum(raw?: unknown): ImpressumData {
  const src = raw && typeof raw === "object" ? (raw as Record<string, { na?: unknown; v?: unknown } | undefined>) : {};
  const out: ImpressumData = {};
  for (const s of IMPRESSUM_SECTIONS) {
    const given = src[s.id];
    const values = given && typeof given.v === "object" && given.v ? (given.v as Record<string, unknown>) : {};
    const v: Record<string, string> = {};
    for (const f of s.fields) v[f.id] = typeof values[f.id] === "string" ? (values[f.id] as string) : "";
    const canBeNA = s.naByDefault !== undefined;
    out[s.id] = { na: canBeNA ? (typeof given?.na === "boolean" ? given.na : s.naByDefault === true) : false, v };
  }
  return out;
}

/** Fehlende Pflichtangaben (nur in zutreffenden Abschnitten), z. B. „Registereintrag: Registernummer“. */
export function missingImpressumFields(data: ImpressumData): string[] {
  const missing: string[] = [];
  for (const s of IMPRESSUM_SECTIONS) {
    const d = data[s.id];
    if (!d || d.na) continue;
    for (const f of s.fields) if (f.required && !d.v[f.id]?.trim()) missing.push(`${s.title}: ${f.label}`);
    // Steuer: mindestens eine der beiden Nummern
    if (s.id === "steuer" && !d.v.vatId?.trim() && !d.v.wId?.trim()) missing.push(`${s.title}: Umsatzsteuer- oder Wirtschafts-Identifikationsnummer (oder „nicht anwendbar“ wählen)`);
  }
  return missing;
}

/** Text für die Website aus den Angaben (nur zutreffende Abschnitte). */
export function impressumToBlocks(data: ImpressumData): PolicyBlock[] {
  const blocks: PolicyBlock[] = [{ t: "p", text: "Angaben gemäß § 5 DDG" }];
  for (const s of IMPRESSUM_SECTIONS) {
    const d = data[s.id];
    if (!d || d.na) continue;
    blocks.push(...s.render(d.v));
  }
  return blocks;
}
