// Vorlage der Datenschutzerklärung für alle core-cms-Kundenprojekte (WNT-IT).
// EINZIGE Quelle des Textes: Änderungen hier, dann neue Core-Version veröffentlichen (Skill cms-release).
// Aufbau und Formulierungen folgen dem WNT-IT-Regelwerk (siehe docs/RECHTSTEXTE.md).
//
// Der Text besteht aus Bausteinen. Immer enthalten sind Allgemeines, Hosting, E-Mail, Cookies, Formulare, Rechte.
// Pro Projekt zuschaltbar (DatenschutzConfig.module): Karten, Videos, Terminbuchung, Newsletter, Zufriedenheitsanalyse, KI-Agent.
// Projektangaben (Firma, Anschrift, Kontakt ...) kommen aus DatenschutzConfig und ersetzen die %Platzhalter% im Text.
// Offene Punkte stehen als [● …] im Text und werden im Editor gelb markiert.

import { renumberPolicyBlocks, type LegalDocumentContent, type PolicyBlock } from "../policy";

/** Version der Vorlage (Datum). Bei JEDER inhaltlichen Änderung erhöhen und unten in DATENSCHUTZ_TEMPLATE_CHANGES beschreiben. */
export const DATENSCHUTZ_TEMPLATE_VERSION = "2026-11-05";

/** Was sich in der Vorlage geändert hat (neueste zuerst), in einfacher Sprache. Wird im Admin bei einer neuen Vorlage angezeigt. */
export const DATENSCHUTZ_TEMPLATE_CHANGES: { version: string; text: string }[] = [
  {
    version: "2026-11-05",
    text: "Erste Fassung der Core-Vorlage (nach dem Regelwerk 04.11.2026). Hosting und Betrieb durch den Auftragsverarbeiter mit Vercel und Supabase (Drittländer USA und Singapur, Standardvertragsklauseln und DPF), Versand über Microsoft 365, zuschaltbare Bausteine für Karten, Videos, Terminbuchung, Newsletter, Zufriedenheitsanalyse und KI-Agent.",
  },
];

export interface DatenschutzConfig {
  /** Kurzname für den Titel, z. B. „Alb-Naturenergie“ → „Datenschutzerklärung Alb-Naturenergie Webseiten“ */
  kurzname: string;
  /** Fassung (Datum) unter dem Titel, z. B. „04.11.2026“. Leer: heutiges Datum beim Erzeugen. */
  fassung: string;
  firma: string;
  strasse: string;
  plz: string;
  ort: string;
  telefon: string;
  email: string;
  /** E-Mail-Adresse für Datenschutzanfragen */
  datenschutzEmail: string;
  /** Name und Anschrift des Datenschutzbeauftragten, falls bestellt (sonst leer: Platzhalter im Text) */
  datenschutzbeauftragter: string;
  /** Alle Domains der Webseiten, z. B. „alb-naturenergie.com und alb-naturenergie.de“ */
  domains: string;
  bundesland: string;
  /** Zuständige Aufsichtsbehörde mit Anschrift */
  aufsicht: string;
  /** Standort der Datenbank (Supabase-Projekt): bestimmt den Satz in 2.1 */
  datenbankStandort: "irland" | "frankfurt" | "sonstiger";
  /** E-Mail-Versanddienst der Webseiten */
  emailDienst: "microsoft365" | "sonstiger";
  /** Verlinkte externe Seiten, z. B. „zu unseren Profilen bei Instagram und LinkedIn“ */
  verlinkt: string;
  /** Name des Eintrags im Local Storage für die Cookie-Auswahl (aus dem Cookie-Banner des Projekts) */
  consentKey: string;
  /** Weitere Formulare neben dem Kontaktformular, z. B. „das Formular zur Mietverwaltung“ (leer: keine) */
  weitereFormulare: string;
  /** Zusätzliche Angaben in diesen Formularen, z. B. „beim Formular zur Mietverwaltung die Angaben zur Wohnung“ (leer: keine) */
  weitereFormularDaten: string;
  module: {
    karten: boolean;
    videos: boolean;
    terminbuchung: boolean;
    newsletter: boolean;
    zufriedenheit: boolean;
    kiAgent: boolean;
  };
}

export const DEFAULT_DATENSCHUTZ_CONFIG: DatenschutzConfig = {
  kurzname: "",
  fassung: "",
  firma: "",
  strasse: "",
  plz: "",
  ort: "",
  telefon: "",
  email: "",
  datenschutzEmail: "",
  datenschutzbeauftragter: "",
  domains: "",
  bundesland: "Baden-Württemberg",
  aufsicht: "Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg, Lautenschlagerstraße 20, 70173 Stuttgart.",
  datenbankStandort: "irland",
  emailDienst: "microsoft365",
  verlinkt: "zu unseren Profilen bei Instagram, Facebook, LinkedIn und YouTube oder zur Routenplanung bei Google Maps und Apple Karten",
  consentKey: "",
  weitereFormulare: "",
  weitereFormularDaten: "",
  module: { karten: false, videos: false, terminbuchung: false, newsletter: false, zufriedenheit: false, kiAgent: false },
};

const TEXT_KEYS = [
  "kurzname", "fassung", "firma", "strasse", "plz", "ort", "telefon", "email", "datenschutzEmail", "datenschutzbeauftragter",
  "domains", "bundesland", "aufsicht", "verlinkt", "consentKey", "weitereFormulare", "weitereFormularDaten",
] as const;

/** Prüft beliebige Eingaben und macht daraus eine vollständige Konfiguration (unbekannte Felder entfallen, Texte werden gekürzt). */
export function normalizeDatenschutzConfig(raw: unknown): DatenschutzConfig {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: DatenschutzConfig = { ...DEFAULT_DATENSCHUTZ_CONFIG, module: { ...DEFAULT_DATENSCHUTZ_CONFIG.module } };
  for (const k of TEXT_KEYS) if (typeof src[k] === "string") out[k] = (src[k] as string).trim().slice(0, 1000);
  if (src.datenbankStandort === "irland" || src.datenbankStandort === "frankfurt" || src.datenbankStandort === "sonstiger") out.datenbankStandort = src.datenbankStandort;
  if (src.emailDienst === "microsoft365" || src.emailDienst === "sonstiger") out.emailDienst = src.emailDienst;
  const mod = (src.module && typeof src.module === "object" ? src.module : {}) as Record<string, unknown>;
  for (const k of Object.keys(out.module) as (keyof DatenschutzConfig["module"])[]) if (typeof mod[k] === "boolean") out.module[k] = mod[k] as boolean;
  return out;
}

/** Beschriftung der zuschaltbaren Bausteine (für die Auswahl im Admin). */
export const DATENSCHUTZ_MODULE_LABELS: Record<keyof DatenschutzConfig["module"], { label: string; hint: string }> = {
  karten: { label: "Karten (Google Maps)", hint: "Eingebettete Karte mit Einwilligung (Zwei-Klick-Lösung)." },
  videos: { label: "Videos (YouTube)", hint: "Eingebettete YouTube-Videos im erweiterten Datenschutzmodus." },
  terminbuchung: { label: "Online-Terminbuchung (Microsoft Bookings)", hint: "Eingebettete Buchungsseite." },
  newsletter: { label: "Newsletter (CleverReach)", hint: "Anmeldung und Versand des Newsletters." },
  zufriedenheit: { label: "Meinungs- und Zufriedenheitsanalyse", hint: "Auswertung freiwilliger Rückmeldungen." },
  kiAgent: { label: "KI-Agent / WhatsApp-Chatbot", hint: "Chatbot für Meldungen und Anfragen." },
};

// ───────────── Bausteine (Text mit %Platzhaltern%) ─────────────

const intro: PolicyBlock[] = [
  {"t":"p","text":"Liebe Webseitenbesucher, vielen Dank für Ihren Besuch!"},
  {"t":"p","text":"Durch diese Datenschutzerklärung möchten wir Sie über die Datenverarbeitung Ihrer personenbezogenen Daten (im Folgenden „Daten“) informieren, die aus dem Besuch unserer Webseiten resultieren."},
  {"t":"p","text":"Wir bitten Sie, diese Datenschutzerklärung durchzulesen, bevor Sie unsere Webseiten sowie die darin enthaltenen Funktionen nutzen."},
  {"t":"p","text":"Unsere Datenschutzerklärung gilt nur für unsere Webseiten (alle Seiten unter %domains%) und nicht für Webseiten Dritter."},
];

const allgemeines: PolicyBlock[] = [
  {"t":"h1","text":"Allgemeine Informationen"},
  {"t":"h2","text":"Verantwortlicher für diese Datenschutzerklärung"},
  {"t":"p","text":"@@ADRESSE@@"},
  {"t":"p","text":"@@ANSPRECHPARTNER@@"},
  {"t":"h2","text":"Datenschutz und Datensicherheit"},
  {"t":"p","text":"Der Schutz Ihrer Privatsphäre ist uns sehr wichtig. Zum Schutz Ihrer Daten trifft unser Unternehmen eine Vielzahl an technischen und organisatorischen Maßnahmen, um eine unbefugte Kenntnisnahme und Weitergabe, Manipulation, Verlust und unbefugte Löschung wirksam verhindern zu können."},
  {"t":"p","text":"Die von uns ergriffenen Maßnahmen unterliegen dabei der stetigen Aktualisierung. Wir orientieren uns dabei an den gesetzlichen Vorgaben, Best-Practice-Ansätzen sowie technischen Entwicklungen."},
  {"t":"p","text":"Im Folgenden unterrichten wir Sie über Art, Umfang und Zweck der Erhebung, Verarbeitung und Speicherung Ihrer Daten in unserem Unternehmen, soweit dies durch den Besuch oder die Nutzung der Funktionen unserer Webseiten erfolgt."},
  {"t":"h2","text":"Personenbezogene Daten"},
  {"t":"p","text":"Personenbezogene Daten sind gemäß Art. 4 Nr. 1 DSGVO alle Informationen, die sich auf eine identifizierbare natürliche Person beziehen. Dies sind z.B. Angaben wie der Vor- und Nachname, die Anschrift, die E-Mail-Adresse, die Telefon- oder Mobilfunknummer, aber i.d.R. auch die IP-Adresse."},
  {"t":"h2","text":"Umfang der Datenverarbeitung"},
  {"t":"p","text":"Grundsätzlich verfolgen wir das Ziel, die Verarbeitung von Daten während Ihres Besuchs unserer Webseiten auf das erforderliche Mindestmaß zu beschränken. Auch erheben wir i.d.R. nur diejenigen Daten von Ihnen, die wir zwingend zur Zweckerfüllung benötigen."},
  {"t":"p","text":"Wir erheben wissentlich keine Daten von Minderjährigen (= Personen unter 18 Jahren). Sollten wir feststellen, dass uns Daten durch Minderjährige zur Verfügung gestellt wurden, löschen wir diese Daten umgehend."},
  {"t":"p","text":"Eine Übermittlung an Dritte bzw. eine Weitergabe an unsere Partner oder verbundene Unternehmen Ihrer durch uns verarbeiteten Daten erfolgt grundsätzlich nicht ohne Ihr ausdrückliches Einverständnis, es sei denn, dass dies:"},
  {"t":"li","text":"zur Abwicklung unserer vertraglich zugesicherten Leistungen erforderlich ist."},
  {"t":"li","text":"zur Durchsetzung unserer Forderungen notwendig wird."},
  {"t":"li","text":"durch einen gesetzlichen Erlaubnistatbestand legitimiert wird oder wir gesetzlich zur Weitergabe der Daten verpflichtet sind."},
  {"t":"li","text":"für Zwecke der Strafverfolgung, zur Gefahrenabwehr oder zum Schutz unserer Webseiten."},
  {"t":"li","text":"zur Durchsetzung der Rechte Dritter oder im Rahmen der gesetzlichen Auskunftspflichten bzw. einer gerichtlichen Anordnung zur Erteilung der Auskunft erforderlich ist."},
  {"t":"h2","ref":"speicherdauer","text":"Dauer der Speicherung"},
  {"t":"p","text":"Sofern sich aus dieser Datenschutzerklärung nichts anderes ergibt, speichern wir die Daten nur solange, wie es zur Erreichung des Verarbeitungszwecks oder für die Erfüllung unserer vertraglichen oder gesetzlichen Pflichten erforderlich ist. Solche gesetzlichen Aufbewahrungspflichten können sich insbesondere aus handels- oder steuerrechtlichen Vorschriften ergeben. Ab dem Schluss des Kalenderjahres, in dem die Daten erhoben wurden, werden wir solche Daten, die in unseren Buchhaltungsdaten enthalten sind, für zehn Jahre aufbewahren und in Handelsbriefen und Verträgen vorhandene Daten für sechs Jahre aufbewahren. Im Übrigen werden wir Daten im Zusammenhang mit nachweispflichtigen Einwilligungen sowie mit Reklamations- und Forderungsansprüchen für die Dauer der gesetzlichen Verjährungsfristen aufbewahren. Für Werbezwecke gespeicherte Daten werden wir löschen, wenn Sie der Verarbeitung zu diesem Zweck widersprechen."},
  {"t":"p","text":"Die Speicherdauer für die einzelnen Verarbeitungszwecke ist jeweils im Abschnitt „Verarbeitungszwecke“ angegeben."},
  {"t":"h2","text":"Profiling (= automatisierte Entscheidungsfindung)"},
  {"t":"p","text":"Profiling ist jede Art der automatisierten Verarbeitung personenbezogener Daten, die darin besteht, dass diese personenbezogenen Daten verwendet werden, um bestimmte persönliche Aspekte, die sich auf eine natürliche Person beziehen, zu bewerten, insbesondere, um Aspekte bezüglich Arbeitsleistung, wirtschaftlicher Lage, Gesundheit, persönlicher Vorlieben, Interessen, Zuverlässigkeit, Verhalten, Aufenthaltsort oder Ortswechsel dieser natürlichen Person zu analysieren oder vorherzusagen."},
  {"t":"p","text":"Wir treffen keine automatisierte Entscheidung mit rechtlicher Wirkung im Sinne von Art. 22 DSGVO."},
  {"t":"h2","text":"Datenübermittlung in Drittländer"},
  {"t":"p","text":"Der Besuch unserer Webseiten kann mit der Übermittlung bestimmter Daten in Drittländer, also Länder, in denen die DSGVO nicht geltendes Recht ist, verbunden sein. Eine solche Übermittlung erfolgt in zulässiger Weise, wenn die Europäische Kommission festgestellt hat, dass in einem solchen Drittland ein angemessenes Datenschutzniveau geboten ist. Wenn ein solcher Angemessenheitsbeschluss der Europäischen Kommission nicht vorliegt, erfolgt eine Übermittlung von Daten in ein Drittland nur beim Vorliegen geeigneter Garantien gemäß Art. 46 DSGVO oder wenn eine der Voraussetzungen des Art. 49 DSGVO gegeben ist."},
  {"t":"p","text":"Sofern im Folgenden nichts anderes angegeben ist, verwenden wir als geeignete Garantien die EU-Standardvertragsklauseln für die Übermittlung von Daten an Auftragsverarbeiter in Drittländern: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32021D0914."},
  {"t":"p","text":"Ob und auf welcher Grundlage bei einem Dienstleister eine Übermittlung in ein Drittland erfolgen kann, ist jeweils beim betreffenden Verarbeitungszweck beschrieben."},
  {"t":"h2","text":"Verlinkte Webseiten"},
  {"t":"p","text":"Unsere Webseiten verfügen über Verlinkungen zu externen Webseiten, z.B. %verlinkt%. Auf die Inhalte dieser Webseiten haben wir keinen Einfluss und übernehmen daher keine Verantwortung oder Haftung für die Zulässigkeit, Richtigkeit, Darstellung und Vollständigkeit der dort veröffentlichten bzw. angezeigten oder abrufbaren Inhalte."},
  {"t":"p","text":"Wir informieren Sie hiermit darüber, dass beim Aufruf dieser externen Webseiten möglicherweise Ihre IP-Adresse durch den jeweils zuständigen Webseitenbetreiber protokolliert wird. Ein Datenaustausch mit diesen Anbietern findet erst statt, wenn Sie einen solchen Link anklicken."},
  {"t":"p","text":"Wenn Sie unsere Webseiten verlassen, empfehlen wir, die Datenschutzerklärung der externen Webseitenbetreiber zu prüfen, bevor Sie die Webseiten aufrufen oder die dortigen Funktionen nutzen."},
];

const verarbeitungszweckeUeberschrift: PolicyBlock[] = [
  {"t":"h1","text":"Verarbeitungszwecke"},
];

const hosting: PolicyBlock[] = [
  {"t":"h2","text":"Hosting, Betrieb und Sicherheit der Webseiten"},
  {"t":"p","text":"Hosting, Betrieb, Datenbank, technische Wartung und Absicherung unserer Webseiten übernimmt für uns ein von uns beauftragter Dienstleister (im Folgenden „Auftragsverarbeiter“). Alle in diesem Abschnitt beschriebenen Verarbeitungen laufen über die vom Auftragsverarbeiter betriebene Infrastruktur. Der Auftragsverarbeiter verarbeitet die Daten ausschließlich nach unseren Weisungen. Mit ihm haben wir einen Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO geschlossen."},
  {"t":"p","text":"Beim Besuch unserer Webseiten werden technisch bedingt Logfiles erstellt, welche für die Auslieferung, den Betrieb und die Sicherheit unserer Webseiten erforderlich sind. Die Webseiten werden über ein Content Delivery Network (Edge Network) ausgeliefert, d.h. Ihre Anfrage wird zunächst über einen Server in Ihrer Nähe geleitet, der Inhalte zwischenspeichert und schädlichen Datenverkehr (z.B. Cyberangriffe, automatisierte Zugriffe) filtert. Das Edge Network verfügt über Rechenzentren weltweit, wobei Besucher aus Europa vorrangig über europäische Rechenzentren bedient werden. Es erfolgt keine Analyse des Nutzerverhaltens oder eine Profilbildung durch die Auswertung der Logfiles. Die Schriftarten und Bilder der Webseiten liefern wir von unseren eigenen Servern bzw. unserem eigenen Speicher aus; es werden keine Schriftarten von Dritten nachgeladen."},
  {"t":"p","text":"Die Inhalte unserer Webseiten (z.B. Texte, Projekt- und Immobilienangaben, Teamvorstellungen, Neuigkeiten, Bilder und Dokumente) liegen in einer Datenbank und einem Dateispeicher in einem Rechenzentrum in Irland (EU), die der Auftragsverarbeiter für uns betreibt. Bilder und Dokumente werden aus diesem Speicher direkt an Ihren Browser übertragen. Ebenso speichert die Datenbank die Anfragen, die Sie über unsere Formulare absenden (siehe {{ref:kontaktformulare}})."},
  {"t":"p","text":"Die Logfiles enthalten u.a. folgende Daten:"},
  {"t":"li","text":"Browsertyp / -version,"},
  {"t":"li","text":"verwendetes Betriebssystem,"},
  {"t":"li","text":"Spracheinstellungen des Browsers,"},
  {"t":"li","text":"aufgerufene Seite bzw. heruntergeladene Datei,"},
  {"t":"li","text":"die zuvor besuchte Seite (Referrer URL),"},
  {"t":"li","text":"IP-Adresse,"},
  {"t":"li","text":"Datum und Uhrzeit der Serveranfrage,"},
  {"t":"li","text":"übertragene Datenmenge und"},
  {"t":"li","text":"HTTP-Statuscode"},
  {"t":"p","text":"Die Verarbeitung der Daten beruht auf der Rechtsgrundlage des Art. 6 Abs. 1 lit. f) DSGVO (= berechtigtes Interesse). Unser berechtigtes Interesse liegt in der technisch fehlerfreien, schnellen und sicheren Bereitstellung und dem stabilen Betrieb unserer Webseiten (z.B. zur Abwehr von Cyberangriffen), in der Pflege und sicheren Speicherung ihrer Inhalte und der bei uns eingehenden Anfragen sowie in der Erkennung und Aufklärung von Störungen. Da diese Daten für den Betrieb und die Sicherheit der Webseiten erforderlich sind und nur kurzzeitig in Logfiles gespeichert werden, überwiegen Ihre entgegenstehenden Interessen nicht. Soweit Anfragen der Vertragsanbahnung dienen, ergibt sich die Rechtsgrundlage aus dem jeweiligen Verarbeitungszweck."},
  {"t":"p","text":"Der Auftragsverarbeiter setzt als Unterauftragsverarbeiter die Cloud-Infrastruktur der Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA (nachfolgend „Vercel“), sowie der Supabase Pte. Ltd., 250 North Bridge Road, #27-01, Raffles City Tower, Singapur 179101 (nachfolgend „Supabase“), ein. Vercel stellt die Auslieferung und die Ausführung der Webseiten bereit, Supabase die Datenbank und den Dateispeicher. Die serverseitige Verarbeitung (z.B. beim Absenden eines Formulars) erfolgt bei Vercel in der Region Frankfurt am Main (Deutschland)."},
  {"t":"p","text":"Eine Übermittlung und Verarbeitung Ihrer Daten in Drittländern (USA, Singapur) kann deshalb nicht ausgeschlossen werden. Vercel ist unter dem EU-US Data Privacy Framework (DPF) zertifiziert. Das DPF ist ein Angemessenheitsbeschluss der Europäischen Kommission gemäß Art. 45 DSGVO, der zertifizierten US-Unternehmen ein angemessenes Datenschutzniveau bestätigt. Ergänzend stützt sich der Datentransfer an Vercel wie auch an Supabase auf die EU-Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c) DSGVO."},
  {"t":"p","text":"IP-Adressen in den Server-Logfiles werden von Vercel automatisiert nach 24 Stunden gelöscht. Datensicherungen der Datenbank werden nach [● Dauer, z. B. 7 Tagen] gelöscht. Für Anfragen gilt die Speicherdauer in {{ref:kontaktformulare}}."},
];

const email: PolicyBlock[] = [
  {"t":"h2","text":"Versand von E-Mails"},
  {"t":"p","text":"E-Mails, die automatisch oder über unsere Webseiten ausgelöst werden, versenden wir über einen E-Mail-Versanddienst. Dies betrifft insbesondere die interne Benachrichtigung über Anfragen, die Sie über ein Formular auf unseren Webseiten absenden. Diesen Dienst nutzen wir für alle auf diese Weise versendeten E-Mails; in den übrigen Abschnitten weisen wir deshalb nur darauf hin, dass eine E-Mail versendet wird. Eine automatische Bestätigungs-E-Mail an Sie versenden wir nicht. Antworten auf Ihre Anfrage versenden wir aus unserem E-Mail-Postfach.%newsletterSatz%"},
  {"t":"p","text":"Dabei werden die Angaben aus der jeweiligen E-Mail (z.B. Name, E-Mail-Adresse, Telefonnummer und Nachricht aus Ihrer Anfrage) sowie technische Versanddaten (z.B. Zeitpunkt und Zustellstatus) verarbeitet."},
  {"t":"p","text":"Die Rechtsgrundlage ergibt sich aus dem jeweiligen Verarbeitungszweck."},
  {"t":"p","text":"@@MAILDIENST@@"},
  {"t":"p","text":"Die E-Mails werden gelöscht, sobald Ihr Anliegen abschließend bearbeitet ist, längstens jedoch nach den Fristen für Anfragen (siehe {{ref:kontaktformulare}})."},
];

const cookies: PolicyBlock[] = [
  {"t":"h2","ref":"cookies","text":"Cookies und Einwilligungsmanagement"},
  {"t":"p","text":"Cookies sind Textdateien, die im Speicher des Endgeräts (z.B. Smartphone, Laptop, Tablet) abgelegt werden, von dem aus Sie unsere Webseiten aufrufen. Ebenso kann der Speicher Ihres Browsers (sog. Local Storage) genutzt werden, um Informationen abzulegen. Dauerhafte Cookies können einige Sekunden bis mehrere Jahre lang auf Ihrem Gerät gespeichert werden. Temporäre Cookies (sog. Session-Cookies) werden automatisch gelöscht, sobald Sie Ihren Browser schließen bzw. die Session beenden."},
  {"t":"p","text":"Cookies und vergleichbare Speicherungen helfen uns, zuvor von Ihnen gewählte Einstellungen (z.B. Ihre Auswahl im Cookie-Banner) bei einem erneuten Besuch zu berücksichtigen%embedFunktionenTeil%."},
  {"t":"p","text":"Technisch notwendige Speicherungen erfolgen auf Grundlage von Art. 6 Abs. 1 lit. f) DSGVO (= berechtigtes Interesse) und § 25 Abs. 2 Nr. 2 TDDDG. Unser berechtigtes Interesse liegt darin, den Betrieb unserer Webseiten und die von Ihnen ausdrücklich gewünschten Funktionen zu ermöglichen. Technisch nicht notwendige Speicherungen und Zugriffe, insbesondere durch Dienste von Drittanbietern, erfolgen nur mit Ihrer Einwilligung gemäß Art. 6 Abs. 1 lit. a) DSGVO (= Einwilligung) und § 25 Abs. 1 TDDDG. Wir setzen keine Dienste zur Reichweitenmessung oder zu Werbezwecken ein."},
  {"t":"p","text":"Ihre Auswahl im Cookie-Banner sowie Ihre Freigaben für eingebettete Inhalte speichern wir im Local Storage Ihres Browsers (Eintrag „%consentKey%“), damit wir sie bei Ihrem nächsten Besuch berücksichtigen können. Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG sowie Art. 6 Abs. 1 lit. c) DSGVO in Verbindung mit Art. 7 Abs. 1 DSGVO (Nachweis der Einwilligung). Ihre Auswahl bleibt gespeichert, bis Sie sie über die Cookie-Einstellungen ändern oder die Daten Ihres Browsers löschen. Die Auswahl wird nicht an uns übertragen."},
  {"t":"p","text":"Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft über die „Cookie-Einstellungen“ am Ende jeder Seite widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt unberührt."},
  {"t":"p","text":"Sofern Sie nicht möchten, dass Cookies auf Ihrem Gerät gespeichert werden, können Sie Ihren Browser so einstellen, dass er Sie über die Platzierung von Cookies benachrichtigt oder diese nicht akzeptiert. Weitere Informationen finden Sie in der Onlinehilfe Ihres Browsers. Wenn Sie durch uns eingesetzte Cookies blockieren, können Sie möglicherweise einzelne Funktionen unserer Webseiten nicht oder nur eingeschränkt verwenden."},
  {"t":"p","text":"Eine Übermittlung von Daten in Drittländer findet durch die in diesem Abschnitt beschriebene Speicherung nicht statt."},
];

const eingebettetEinleitung: PolicyBlock[] = [
  {"t":"h2","text":"Eingebettete Inhalte"},
  {"t":"p","text":"Auf einzelnen Seiten binden wir Inhalte von Drittanbietern ein (%embedArten%). Die Inhalte werden erst geladen, wenn Sie auf den Platzhalter klicken oder in den Cookie-Einstellungen dem jeweiligen Dienst zustimmen. Vorher werden keine Daten an den Anbieter übermittelt. Ihre Freigabe je Anbieter speichern wir in Ihrem Browser (siehe {{ref:cookies}}). Rechtsgrundlage für das Laden der Inhalte ist jeweils Ihre Einwilligung gemäß Art. 6 Abs. 1 lit. a) DSGVO und § 25 Abs. 1 TDDDG. Sie können die Einwilligung jederzeit mit Wirkung für die Zukunft über die „Cookie-Einstellungen“ am Ende jeder Seite widerrufen."},
];

const karten: PolicyBlock[] = [
  {"t":"h3","text":"Karten (Google Maps)"},
  {"t":"p","text":"Wir nutzen auf einzelnen Projektseiten Google Maps der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland, zur Darstellung des Standorts. Bei der Einbindung wird Ihre IP-Adresse zusammen mit dem aufgerufenen Kartenausschnitt an Google übermittelt, damit die Karte an Ihren Browser gesendet werden kann. Google kann zudem eigene Cookies setzen und Informationen über Ihre Nutzung der Karte erfassen."},
  {"t":"p","text":"Google erbringt diesen Dienst auf Grundlage seiner eigenen Bedingungen und ist insoweit nicht unser Auftragsverarbeiter, sondern eigener Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO. Weitere Informationen zum Datenschutz bei Google finden Sie unter: https://policies.google.com/privacy"},
  {"t":"p","text":"Eine Übermittlung von Daten an die Google LLC in den USA kann nicht ausgeschlossen werden. Die Google LLC ist unter dem EU-US Data Privacy Framework zertifiziert. Die Übermittlung stützt sich daher auf den Angemessenheitsbeschluss der Europäischen Kommission gemäß Art. 45 DSGVO."},
  {"t":"p","text":"Wir selbst speichern im Zusammenhang mit der Karte keine Daten. Die Speicherdauer bei Google richtet sich nach den Datenschutzhinweisen von Google."},
];

const videos: PolicyBlock[] = [
  {"t":"h3","text":"Videos (YouTube)"},
  {"t":"p","text":"Wir binden Videos des Dienstes „YouTube“ der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland, ein. Dabei nutzen wir den „erweiterten Datenschutzmodus“ von YouTube. Sobald Sie das Video laden, werden Ihre IP-Adresse und Informationen über die aufgerufene Seite an YouTube übermittelt. Sind Sie zusätzlich in Ihrem YouTube- bzw. Google-Konto angemeldet, kann YouTube Ihr Nutzungsverhalten Ihrem Konto zuordnen."},
  {"t":"p","text":"Google erbringt diesen Dienst auf Grundlage seiner eigenen Bedingungen und ist insoweit nicht unser Auftragsverarbeiter, sondern eigener Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO. Weitere Informationen zum Datenschutz bei Google finden Sie unter: https://policies.google.com/privacy"},
  {"t":"p","text":"Eine Übermittlung von Daten an die Google LLC und die YouTube LLC in den USA kann nicht ausgeschlossen werden. Die Google LLC ist unter dem EU-US Data Privacy Framework zertifiziert [● Status der YouTube LLC prüfen]. Die Übermittlung stützt sich daher auf den Angemessenheitsbeschluss der Europäischen Kommission gemäß Art. 45 DSGVO."},
  {"t":"p","text":"Wir selbst speichern im Zusammenhang mit den Videos keine Daten. Die Speicherdauer bei Google richtet sich nach den Datenschutzhinweisen von Google."},
];

const terminbuchung: PolicyBlock[] = [
  {"t":"h3","text":"Online-Terminbuchung (Microsoft Bookings)"},
  {"t":"p","text":"Für die Buchung eines kostenlosen Erstgesprächs (Energieberatung bzw. Immobilienverkauf) binden wir den Dienst „Microsoft Bookings“ der Microsoft Ireland Operations Limited, One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland, ein. Beim Laden des Buchungsformulars werden Ihre IP-Adresse und technische Angaben zu Ihrem Browser an Microsoft übermittelt. Wenn Sie einen Termin buchen, verarbeiten wir die von Ihnen im Formular eingegebenen Daten (z.B. Name, E-Mail-Adresse, Telefonnummer, gewählter Termin und ggf. Ihre Anmerkungen), um den Termin zu vereinbaren und durchzuführen. Rechtsgrundlage hierfür ist Art. 6 Abs. 1 lit. b) DSGVO (= Vertragsanbahnung)."},
  {"t":"p","text":"Microsoft verarbeitet die Daten als unser Auftragsverarbeiter auf Grundlage eines Vertrags zur Auftragsverarbeitung gemäß Art. 28 DSGVO. Weitere Informationen zum Datenschutz bei Microsoft finden Sie unter: https://privacy.microsoft.com/de-de/privacystatement"},
  {"t":"p","text":"Eine Übermittlung von Daten an die Microsoft Corporation in den USA kann nicht ausgeschlossen werden. Die Microsoft Corporation ist unter dem EU-US Data Privacy Framework zertifiziert. Die Übermittlung stützt sich daher auf den Angemessenheitsbeschluss der Europäischen Kommission gemäß Art. 45 DSGVO. Ergänzend sind die EU-Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c) DSGVO Bestandteil des Vertrags zur Auftragsverarbeitung."},
  {"t":"p","text":"Die Buchungsdaten speichern wir, bis Ihr Anliegen abschließend bearbeitet ist, längstens jedoch [● Speicherdauer]. Sofern aus dem Gespräch eine Geschäftsbeziehung entsteht, gelten die Fristen in {{ref:speicherdauer}}."},
];

const formulare: PolicyBlock[] = [
  {"t":"h2","ref":"kontaktformulare","text":"Kontaktformulare und Anfragen"},
  {"t":"p","text":"Unsere Webseiten bieten an mehreren Stellen die Möglichkeit, direkt mit uns in Kontakt zu treten, z.B. über %formulare%. Der Transfer Ihrer Daten erfolgt dabei verschlüsselt (zu erkennen an dem „https“ in der Adresszeile des Browsers). Alle als Pflichtfelder gekennzeichneten Datenfelder sind zur Bearbeitung Ihres Anliegens erforderlich. Eine Nichtbereitstellung hat zur Folge, dass wir Ihr Anliegen nicht bearbeiten können. Die Bereitstellung weiterer Daten erfolgt freiwillig. Sie können uns alternativ auch per E-Mail an %email% oder telefonisch kontaktieren."},
  {"t":"p","text":"Wir verarbeiten folgende Daten:"},
  {"t":"li","text":"Name (beim Formular zur Mietverwaltung Vor- und Nachname),"},
  {"t":"li","text":"E-Mail-Adresse,"},
  {"t":"li","text":"Telefonnummer und Unternehmen (soweit angegeben),"},
  {"t":"li","text":"%formularDaten%,"},
  {"t":"li","text":"die Seite, von der aus Sie die Anfrage senden, sowie Datum und Uhrzeit der Anfrage."},
  {"t":"p","text":"Wir verarbeiten die Daten zum Zweck, Ihre Anfrage zu beantworten. Sofern sich Ihre Anfrage auf den Abschluss oder die Durchführung eines Vertrages mit uns richtet, ist Art. 6 Abs. 1 lit. b) DSGVO (= Vertragsanbahnung und Erfüllung eines Vertrags) die Rechtsgrundlage. Ansonsten verarbeiten wir die Daten auf Grundlage von Art. 6 Abs. 1 lit. f) DSGVO. Unser berechtigtes Interesse liegt darin, mit anfragenden Personen in Kontakt zu treten und deren Anliegen zu bearbeiten."},
  {"t":"p","text":"Zum Schutz vor automatisierten Absendern (Spam) prüfen wir beim Absenden, ob ein für Menschen unsichtbares Feld ausgefüllt wurde und wie lange das Ausfüllen des Formulars gedauert hat. Zudem begrenzen wir die Zahl der Anfragen je IP-Adresse (höchstens fünf innerhalb von zehn Minuten). Hierfür wird Ihre IP-Adresse kurzzeitig im Arbeitsspeicher des Servers vorgehalten und nicht dauerhaft gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f) DSGVO. Unser berechtigtes Interesse liegt im Schutz unserer Webseiten und unseres Posteingangs vor Missbrauch."},
  {"t":"p","text":"Ihre Anfrage wird in der Datenbank gespeichert und an unsere Mitarbeitenden per E-Mail weitergeleitet. Eine Weitergabe Ihrer Mitteilungen an weitere externe Empfänger erfolgt nicht."},
  {"t":"p","text":"Wir löschen Ihre Anfrage nach Abschluss der Bearbeitung nach einer kurzen Vorhaltefrist von [● Vorhaltefrist, z. B. 30 Tagen]. Sofern Anfragen zu einer Geschäftsbeziehung führen, speichern wir sie bis zum Ende der Geschäftsbeziehung unter Beachtung der handels- und steuerrechtlichen Vorgaben aus HGB und AO, in diesen Fällen zwischen 6 und 10 Jahren, je nach Art der Kommunikationsinhalte und Dokumentenart (z.B. Handelsbrief, Rechnung, Verträge, etc.)."},
];

const newsletter: PolicyBlock[] = [
  {"t":"h2","ref":"newsletter","text":"Newsletter"},
  {"t":"p","text":"Wir bieten die Möglichkeit an, sich für unseren Newsletter anzumelden. Nach der Anmeldung informieren wir Sie regelmäßig über aktuelle Neuigkeiten zu unseren Angeboten. Für die Anmeldung sind Ihr Name und eine gültige E-Mail-Adresse erforderlich. Zur Verifizierung der E-Mail-Adresse erhalten Sie zunächst eine Anmelde-E-Mail, die Sie über einen Link bestätigen müssen (Double-Opt-In)."},
  {"t":"p","text":"Wir verarbeiten dabei folgende Daten:"},
  {"t":"li","text":"Name und E-Mail-Adresse,"},
  {"t":"li","text":"Datum und Uhrzeit der Anmeldung und der Bestätigung sowie die dabei verwendete IP-Adresse (zum Nachweis der Einwilligung) und"},
  {"t":"li","text":"technische Versanddaten (z.B. Zeitpunkt und Zustellstatus)."},
  {"t":"p","text":"Der Versand des Newsletters beruht auf Ihrer Einwilligung gemäß Art. 6 Abs. 1 lit. a) DSGVO (= Einwilligung). Die Verarbeitung der Anmeldedaten und des Anmeldezeitpunkts ist erforderlich, um eine erteilte Einwilligung nachweisen zu können. Die Rechtsgrundlage ergibt sich aus unserer gesetzlichen Pflicht zur Dokumentation Ihrer Einwilligung gemäß Art. 7 Abs. 1 DSGVO."},
  {"t":"p","text":"Die erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen, z.B. über den Link „Abmelden“ im Newsletter oder indem Sie uns über %dsEmail% kontaktieren. Die Rechtmäßigkeit bereits erfolgter Datenverarbeitungsvorgänge bleibt von einem Widerruf unberührt."},
  {"t":"p","text":"Für den Versand des Newsletters nutzen wir den Dienst „CleverReach“ der CleverReach GmbH & Co. KG, Schafjückenweg 2, 26180 Rastede, Deutschland. Mit CleverReach haben wir einen Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO geschlossen. Weitere Informationen zum Datenschutz bei CleverReach finden Sie unter: https://www.cleverreach.com/de/datenschutz/"},
  {"t":"p","text":"CleverReach hat seinen Sitz in der EU (Deutschland). [● Drittlandübermittlung anhand des AVV mit CleverReach prüfen: Unterauftragnehmer in Drittländern ja/nein, ggf. Garantien]"},
  {"t":"p","text":"Ihre Anmeldedaten speichern wir, bis Sie sich vom Newsletter abmelden oder Ihre Einwilligung widerrufen. Die Nachweisdaten der Einwilligung bewahren wir für die Dauer der gesetzlichen Verjährungsfristen auf (siehe {{ref:speicherdauer}})."},
  {"t":"h3","text":"Newsletter-Analyse"},
  {"t":"p","text":"[● Wertet CleverReach das Öffnungs- und Klickverhalten aus? Falls ja, Satz: „Wir werten aus, ob und wann Sie den Newsletter öffnen und welche Links Sie anklicken. Hierfür werden Zählpixel und personalisierte Links verwendet. Rechtsgrundlage ist Ihre Einwilligung gemäß Art. 6 Abs. 1 lit. a) DSGVO und § 25 Abs. 1 TDDDG, die Sie mit der Anmeldung erteilen und jederzeit durch Abmeldung widerrufen können.“ Falls nein: Abschnitt streichen.]"},
];

const zufriedenheit: PolicyBlock[] = [
  {"t":"h2","text":"Meinungs- und Zufriedenheitsanalyse"},
  {"t":"p","text":"Sofern Sie uns freiwillig, z.B. über das Kontaktformular, per E-Mail oder auf anderem Wege, Lob, Hinweise, Anregungen oder Kritik mitteilen, verarbeiten wir Ihre Angaben (z.B. Name, Kontaktdaten und den Inhalt Ihrer Mitteilung) ausschließlich, um"},
  {"t":"li","text":"auf Ihre Kritik geeignet zu reagieren und nach Prüfung Ihres Anliegens bei Bedarf angemessene Verbesserungsmaßnahmen einzuleiten,"},
  {"t":"li","text":"Ihre Anregungen und Hinweise als Anlass zu nehmen, um unsere Dienstleistungen weiter verbessern zu können und"},
  {"t":"li","text":"Ihr Lob als Wertschätzung an die relevanten Stellen weiterzuleiten."},
  {"t":"p","text":"Die Rechtsgrundlage für die Verarbeitung Ihrer Daten zu den genannten Zwecken ist Art. 6 Abs. 1 lit. f) DSGVO (= berechtigtes Interesse). Unser berechtigtes Interesse liegt darin, auf Ihr Anliegen zu reagieren und unsere Angebote zu verbessern."},
  {"t":"p","text":"Eingehende Mitteilungen werden intern an die zuständigen Mitarbeitenden weitergeleitet. Eine Weitergabe an externe Empfänger erfolgt nicht. Die Speicherdauer richtet sich nach {{ref:kontaktformulare}}."},
];

const kiAgent: PolicyBlock[] = [
  {"t":"h2","text":"KI-Agent / WhatsApp-Chatbot"},
  {"t":"p","text":"Zur Verbesserung der Erreichbarkeit sowie zur effizienten und barrierearmen Kommunikation mit Eigentümern und Mietern setzen wir einen KI-gestützten Chatbot (nachfolgend „KI-Agent“) ein. Die Kommunikation mit dem KI-Agenten erfolgt dabei über unser WhatsApp-Business-Konto."},
  {"t":"p","text":"Im Rahmen der Nutzung des KI-Agenten verarbeiten wir die von Ihnen im Chat bereitgestellten personenbezogenen Daten (z.B. E-Mail-Adresse) sowie die personenbezogenen Daten Ihres WhatsApp-Profils (z.B. Name, Telefonnummer). Die Verarbeitung erfolgt ausschließlich zu dem Zweck, Ihre Anfrage zu bearbeiten, insbesondere zur Entgegennahme, Zuordnung und Bearbeitung von Schadensmeldungen sowie sonstigen verwaltungsbezogenen Anliegen."},
  {"t":"p","text":"Die Rechtsgrundlage für die Datenverarbeitung ist Art. 6 Abs. 1 lit. f) DSGVO (= berechtigtes Interesse). Unser berechtigtes Interesse sowie das berechtigte Interesse der Eigentümer und der Mieter besteht in einer schnellen, effizienten und zeitgemäßen Kommunikation sowie in der strukturierten Bearbeitung von Meldungen und Anfragen."},
  {"t":"p","text":"Für den Betrieb und die technische Instandhaltung des KI-Agenten setzen wir [● Dienstleister bzw. Beschreibung nach Überarbeitung des KI-Agenten ergänzen] als Auftragsverarbeiter auf Grundlage eines Vertrags zur Auftragsverarbeitung gemäß Art. 28 DSGVO ein. Für die Nachrichtenübermittlung nutzen wir WhatsApp der WhatsApp Ireland Limited [● Anschrift prüfen]. [● Rolle von WhatsApp (eigener Verantwortlicher / Auftragsverarbeiter) bestätigen.]"},
  {"t":"p","text":"Eine Übermittlung von Daten in Drittländer [● findet nicht statt / erfolgt auf Grundlage von … nach Überarbeitung des KI-Agenten bestätigen]. Dies betrifft insbesondere die eingesetzten KI-Modelle."},
  {"t":"p","text":"Die Chatverläufe und Meldungen speichern wir, bis Ihr Anliegen abschließend bearbeitet ist, längstens jedoch [● Speicherdauer]. Sofern daraus eine Geschäftsbeziehung entsteht, gelten die Fristen in {{ref:speicherdauer}}."},
  {"t":"p","text":"Weitere Informationen zur Verarbeitung Ihrer personenbezogenen Daten als Eigentümer oder Mieter gemäß Art. 13 und 14 DSGVO erhalten Sie bei unserer Hausverwaltung."},
];

const rechte: PolicyBlock[] = [
  {"t":"h1","text":"Ihre Rechte"},
  {"t":"h2","text":"Auskunftsrecht"},
  {"t":"p","text":"Webseitenbesucher unseres Onlineauftritts haben gemäß Art. 15 DSGVO das Recht, auf Anfrage, jederzeit und kostenfrei Auskunft über Ihre in unserem Unternehmen zu Ihrer Person verarbeiteten Daten zu erhalten. Der Umfang der Auskunft ergibt sich aus Art. 15 DSGVO."},
  {"t":"p","text":"Ihr Auskunftsbegehren richten Sie bitte via Mail an folgende Adresse %dsEmail%."},
  {"t":"h2","text":"Recht auf Berichtigung Ihrer Daten"},
  {"t":"p","text":"Sie haben gemäß Art. 16 DSGVO das Recht, bei Vorliegen unrichtiger oder unvollständiger Daten über Sie, die Berichtigung oder Vervollständigung dieser zu verlangen. Wir werden entsprechende Anfragen prüfen und in berechtigten Fällen die erforderlichen Maßnahmen ergreifen."},
  {"t":"h2","text":"Recht auf Löschung und Sperrung Ihrer Daten"},
  {"t":"p","text":"Sie haben gemäß Art. 17 DSGVO das Recht auf Löschung Ihrer Daten.\nDie von uns über Sie gespeicherten Daten werden datenschutzkonform vernichtet bzw. gelöscht, wenn:"},
  {"t":"li","text":"die gesetzlichen Aufbewahrungsfristen abgelaufen sind, oder"},
  {"t":"li","text":"die Erhebung oder Verarbeitung unrechtmäßig ist bzw. war, oder"},
  {"t":"li","text":"die Daten zur Erfüllung der Zwecke, zu denen sie erhoben wurden, nicht mehr erforderlich sind oder"},
  {"t":"li","text":"sofern Sie Ihre Einwilligung zur Verarbeitung und Nutzung widerrufen haben"},
  {"t":"li","text":"sofern Sie gemäß Art. 21 DSGVO Widerspruch gegen die Verarbeitung Ihrer Daten einlegen und keine vorrangigen berechtigten Gründe für die Verarbeitung vorliegen"},
  {"t":"p","text":"Wir informieren Sie darüber, dass eine vollständige Löschung erst nach Ablauf der entsprechenden Fristen der steuer- und handelsrechtlichen Vorschriften erfolgt. Bis zum Ablauf dieser Fristen und bis zur endgültigen Löschung werden Ihre Daten entsprechend gesperrt und von uns nicht weiterverarbeitet."},
  {"t":"h2","text":"Recht auf Einschränkung der Datenverarbeitung"},
  {"t":"p","text":"Sie haben gemäß Art. 18 DSGVO das Recht, von uns die Einschränkung der Verarbeitung Ihrer Daten in den in Art. 18 DSGVO festgelegten Fällen und Umfängen zu verlangen. Wir werden entsprechende Anfragen prüfen und in berechtigten Fällen die erforderlichen Maßnahmen ergreifen."},
  {"t":"h2","text":"Recht auf Datenübertragbarkeit"},
  {"t":"p","text":"Sie haben gemäß Art. 20 DSGVO das Recht, Ihre von uns verarbeiteten Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten. Auf Ihren ausdrücklichen Wunsch hin, werden wir Ihre Daten, an die von Ihnen eindeutig benannten Stellen übermitteln, soweit wir dies technisch leisten können und dies datenschutzrechtlich zulässig ist."},
  {"t":"h2","text":"Widerrufs- und Widerspruchsrecht"},
  {"t":"p","text":"Sie haben das Recht, jederzeit und ohne Angabe von Gründen kostenfrei die uns von Ihnen erteilte Einwilligung zur Verarbeitung Ihrer Daten für die Zukunft zu widerrufen bzw. gemäß Art. 21 DSGVO Widerspruch gegen die Verarbeitung Ihrer Daten einzulegen. Ihren Widerruf Ihrer Einwilligung bzw. Widerspruch richten Sie bitte via Mail an folgende Adresse: %dsEmail%."},
  {"t":"p","text":"Soweit wir Ihre Daten auf Grundlage von Art. 6 Abs. 1 lit. f) DSGVO verarbeiten, haben Sie das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit Widerspruch gegen diese Verarbeitung einzulegen (Art. 21 Abs. 1 DSGVO). Werden Ihre Daten für Direktwerbung verarbeitet, können Sie jederzeit ohne Angabe von Gründen widersprechen (Art. 21 Abs. 2 DSGVO)."},
  {"t":"h2","text":"Recht auf Beschwerde bei einer Aufsichtsbehörde"},
  {"t":"p","text":"Sie haben gemäß Art. 77 DSGVO das Recht auf Beschwerde bei einer Aufsichtsbehörde für den Datenschutz, sofern Sie der Ansicht sind, dass die Verarbeitung Ihrer Daten gegen die DSGVO verstößt. Die zuständige Aufsichtsbehörde ist diejenige, in dem unser Unternehmen seinen Hauptsitz hat."},
  {"t":"p","text":"Für das Unternehmen %firma% (Sitz %ort%, %bundesland%) ist dies: %aufsicht%"},
  {"t":"h2","text":"Recht auf wirksamen gerichtlichen Rechtsbehelf gegen den Verantwortlichen"},
  {"t":"p","text":"Sie haben gemäß Art. 79 DSGVO das Recht auf einen wirksamen gerichtlichen Rechtsbehelf, wenn Sie der Ansicht sind, dass Ihre zuvor aufgeführten Rechte infolge einer nicht im Einklang mit den Anforderungen der DSGVO stehenden Verarbeitung Ihrer Daten durch uns oder einen von uns beauftragten Auftragsverarbeiter verletzt wurden."},
  {"t":"h2","text":"Haftung und Recht auf Schadenersatz"},
  {"t":"p","text":"Sie haben gemäß Art. 82 DSGVO einen Anspruch auf Schadenersatz, den Sie gegenüber uns oder die durch uns beauftragten Auftragsverarbeiter geltend machen können, sofern Ihnen wegen eines Verstoßes gegen die DSGVO ein materieller oder immaterieller Schaden entstanden ist."},
];

const aenderung: PolicyBlock[] = [
  {"t":"h1","text":"Änderung der Datenschutzerklärung"},
  {"t":"p","text":"Diese Datenschutzerklärung wird bei neuen gesetzlichen Vorgaben oder wesentlichen Änderungen des Funktionsumfangs unserer Webseiten mit Wirkung für die Zukunft aktualisiert. Wir empfehlen Ihnen daher, unsere Datenschutzerklärung in regelmäßigen zeitlichen Abständen durchzulesen."},
];

// ───────────── Hilfen ─────────────

/** Angabe oder, wenn leer, ein gelber Platzhalter. */
const val = (v: string | undefined, label: string) => (v && v.trim() ? v.trim() : `[● ${label}]`);

const MAIL_MICROSOFT365: PolicyBlock[] = [
  { t: "p", text: "Für den Versand nutzen wir Microsoft 365 (Exchange Online) der Microsoft Ireland Operations Limited, One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland. Microsoft verarbeitet die Daten als unser Auftragsverarbeiter auf Grundlage eines Vertrags zur Auftragsverarbeitung gemäß Art. 28 DSGVO. Weitere Informationen zum Datenschutz bei Microsoft finden Sie unter: https://www.microsoft.com/de-de/privacy/privacystatement" },
  { t: "p", text: "Eine Übermittlung von Daten an die Microsoft Corporation in den USA kann nicht ausgeschlossen werden. Die Microsoft Corporation ist unter dem EU-US Data Privacy Framework zertifiziert. Die Übermittlung stützt sich daher auf den Angemessenheitsbeschluss der Europäischen Kommission gemäß Art. 45 DSGVO. Ergänzend sind die EU-Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c) DSGVO Bestandteil des Vertrags zur Auftragsverarbeitung." },
];

const MAIL_SONSTIGER: PolicyBlock[] = [
  {
    t: "p",
    text: "Für den Versand nutzen wir den E-Mail-Server von [● E-Mail-Dienstleister, Gesellschaft, Anschrift]. [● E-Mail-Dienstleister] verarbeitet die Daten [● als Auftragsverarbeiter auf Grundlage eines Vertrags zur Auftragsverarbeitung gemäß Art. 28 DSGVO / als eigener Verantwortlicher]. Weitere Informationen zum Datenschutz bei [● E-Mail-Dienstleister] finden Sie unter: [● URL]",
  },
  { t: "p", text: "Eine Übermittlung von Daten in Drittländer [● findet nicht statt / erfolgt auf Grundlage von …]." },
];

const DB_STANDORT: Record<DatenschutzConfig["datenbankStandort"], string> = {
  irland: "in einem Rechenzentrum in Irland (EU)",
  frankfurt: "in einem Rechenzentrum in Frankfurt am Main (Deutschland)",
  sonstiger: "in einem Rechenzentrum in [● Land / Region der Datenbank]",
};

/** Ersetzt %name% in allen Texten. */
function fill(blocks: PolicyBlock[], vars: Record<string, string>): PolicyBlock[] {
  return blocks.map((b) => ({ ...b, text: b.text.replace(/%([a-zA-Z]+)%/g, (m, k: string) => (k in vars ? vars[k] : m)) }));
}

/**
 * Baut die Datenschutzerklärung aus den Bausteinen und den Projektangaben. Die Überschriften sind nach ihrer
 * Stelle nummeriert; Verweise ({{ref:…}}) zeigen auf Überschriften mit Kennung.
 */
export function buildDatenschutz(input: Partial<DatenschutzConfig>): LegalDocumentContent {
  const c: DatenschutzConfig = { ...DEFAULT_DATENSCHUTZ_CONFIG, ...input, module: { ...DEFAULT_DATENSCHUTZ_CONFIG.module, ...(input.module ?? {}) } };
  const m = c.module;
  const embeds = [
    m.karten && { funktion: "Karten", art: "Karten" },
    m.videos && { funktion: "YouTube-Videos", art: "Videos" },
    m.terminbuchung && { funktion: "Online-Terminbuchung", art: "Online-Terminbuchung" },
  ].filter(Boolean) as { funktion: string; art: string }[];
  // Reihenfolge wie im Cookie-Text: Videos, Karten, Terminbuchung
  const funktionen = [m.videos && "YouTube-Videos", m.karten && "Karten", m.terminbuchung && "Online-Terminbuchung"].filter(Boolean) as string[];

  const adresse = [val(c.firma, "Firma"), val(c.strasse, "Straße"), `${val(c.plz, "PLZ")} ${val(c.ort, "Ort")}`];
  const vars: Record<string, string> = {
    domains: c.domains.trim() ? c.domains.trim() : "[● Domains der Webseiten]",
    verlinkt: val(c.verlinkt, "Verlinkte Seiten"),
    newsletterSatz: m.newsletter ? " Der Newsletter wird über einen eigenen Dienst versendet (siehe {{ref:newsletter}})." : "",
    embedFunktionenTeil: funktionen.length ? ` und bestimmte Funktionen (z.B. ${funktionen.join(", ")}) bereitzustellen` : "",
    consentKey: val(c.consentKey, "Name des Eintrags im Local Storage"),
    embedArten: embeds.map((e) => e.art).join(", "),
    formulare: c.weitereFormulare.trim() ? `das Kontaktformular oder ${c.weitereFormulare.trim()}` : "das Kontaktformular",
    email: val(c.email, "E-Mail-Adresse"),
    formularDaten: c.weitereFormularDaten.trim() ? `Betreff und Nachricht, ${c.weitereFormularDaten.trim()}` : "Betreff und Nachricht",
    dsEmail: val(c.datenschutzEmail, "E-Mail-Adresse für den Datenschutz"),
    firma: val(c.firma, "Firma"),
    ort: val(c.ort, "Ort"),
    bundesland: val(c.bundesland, "Bundesland"),
    aufsicht: val(c.aufsicht, "Aufsichtsbehörde mit Anschrift"),
  };

  const ansprechpartner = [
    "Ansprechpartner für den Datenschutz beim Verantwortlichen",
    `${val(c.firma, "Firma")} ${c.datenschutzbeauftragter.trim() ? `(Datenschutzbeauftragter: ${c.datenschutzbeauftragter.trim()})` : "[● bzw. Name des Datenschutzbeauftragten, falls bestellt]"}, ${val(c.strasse, "Straße")}, ${val(c.plz, "PLZ")} ${val(c.ort, "Ort")}`,
    vars.dsEmail,
  ].join("\n");
  const verantwortlicher = [...adresse, `Telefon: ${val(c.telefon, "Telefon")}`, `E-Mail: ${vars.email}`].join("\n");

  const replaceMarker = (blocks: PolicyBlock[], marker: string, replacement: PolicyBlock[]) =>
    blocks.flatMap((b) => (b.text === marker ? replacement : [b]));

  let s1 = replaceMarker(allgemeines, "@@ADRESSE@@", [{ t: "p", text: verantwortlicher }]);
  s1 = replaceMarker(s1, "@@ANSPRECHPARTNER@@", [{ t: "p", text: ansprechpartner }]);
  const mail = replaceMarker(email, "@@MAILDIENST@@", c.emailDienst === "microsoft365" ? MAIL_MICROSOFT365 : MAIL_SONSTIGER);
  const hostingBlocks = hosting.map((b) => ({ ...b, text: b.text.replace("in einem Rechenzentrum in Irland (EU)", DB_STANDORT[c.datenbankStandort].replace(/^in /, "in ")) }));

  const blocks: PolicyBlock[] = [
    ...intro,
    ...s1,
    ...verarbeitungszweckeUeberschrift,
    ...hostingBlocks,
    ...mail,
    ...cookies,
    ...(embeds.length ? [...eingebettetEinleitung, ...(m.karten ? karten : []), ...(m.videos ? videos : []), ...(m.terminbuchung ? terminbuchung : [])] : []),
    ...formulare,
    ...(m.newsletter ? newsletter : []),
    ...(m.zufriedenheit ? zufriedenheit : []),
    ...(m.kiAgent ? kiAgent : []),
    ...rechte,
    ...aenderung,
  ];

  const fassung = c.fassung.trim() || new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  return {
    title: `Datenschutzerklärung ${c.kurzname.trim() || val("", "Kurzname")} Webseiten`,
    version: fassung,
    blocks: renumberPolicyBlocks(fill(blocks, vars)),
  };
}
