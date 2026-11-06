// Datenschutz-Aufsichtsbehörden der Bundesländer für Unternehmen (nicht-öffentlicher Bereich).
// Quelle: Anschriftenliste des BfDI (bfdi.bund.de), Bayern: BayLDA (lda.bayern.de), Stand 05.11.2026.
// NRW nennt öffentlich nur die Postanschrift. Ändert sich ein Eintrag, DATENSCHUTZ_TEMPLATE_VERSION erhöhen.

export interface Aufsichtsbehoerde {
  name: string;
  anschrift: string;
  telefon: string;
  email: string;
  website: string;
}

export const AUFSICHTSBEHOERDEN: Record<string, Aufsichtsbehoerde> = {
  "Baden-Württemberg": { name: "Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg", anschrift: "Heilbronner Straße 35, 70191 Stuttgart", telefon: "0711 615541-0", email: "poststelle@lfdi.bwl.de", website: "https://www.baden-wuerttemberg.datenschutz.de" },
  Bayern: { name: "Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)", anschrift: "Promenade 18, 91522 Ansbach", telefon: "0981 180093-0", email: "poststelle@lda.bayern.de", website: "https://www.lda.bayern.de" },
  Berlin: { name: "Berliner Beauftragte für Datenschutz und Informationsfreiheit", anschrift: "Alt-Moabit 59-61, 10555 Berlin", telefon: "030 13889-0", email: "mailbox@datenschutz-berlin.de", website: "https://www.datenschutz-berlin.de" },
  Brandenburg: { name: "Die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg", anschrift: "Stahnsdorfer Damm 77, 14532 Kleinmachnow", telefon: "033203 356-0", email: "poststelle@lda.brandenburg.de", website: "https://www.lda.brandenburg.de" },
  Bremen: { name: "Der Landesbeauftragte für Datenschutz und Informationsfreiheit der Freien Hansestadt Bremen", anschrift: "Georgstraße 122-124, 27570 Bremerhaven", telefon: "0421 3612010", email: "office@datenschutz.bremen.de", website: "https://www.datenschutz.bremen.de" },
  Hamburg: { name: "Der Hamburgische Beauftragte für Datenschutz und Informationsfreiheit", anschrift: "Ludwig-Erhard-Str. 22, 20459 Hamburg", telefon: "040 42854-4040", email: "mailbox@datenschutz.hamburg.de", website: "https://www.datenschutz-hamburg.de" },
  Hessen: { name: "Der Hessische Beauftragte für Datenschutz und Informationsfreiheit", anschrift: "Wilhelmstraße 7, 65185 Wiesbaden", telefon: "0611 1408-0", email: "poststelle@datenschutz.hessen.de", website: "https://www.datenschutz.hessen.de" },
  "Mecklenburg-Vorpommern": { name: "Der Landesbeauftragte für Datenschutz und Informationsfreiheit Mecklenburg-Vorpommern", anschrift: "Lennéstraße 1, 19053 Schwerin", telefon: "0385 59494-0", email: "info@datenschutz-mv.de", website: "https://www.datenschutz-mv.de" },
  Niedersachsen: { name: "Der Landesbeauftragte für den Datenschutz Niedersachsen", anschrift: "Prinzenstraße 5, 30159 Hannover", telefon: "0511 120-4500", email: "poststelle@lfd.niedersachsen.de", website: "https://www.lfd.niedersachsen.de" },
  "Nordrhein-Westfalen": { name: "Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen", anschrift: "Postfach 20 04 44, 40102 Düsseldorf", telefon: "0211 38424-0", email: "poststelle@ldi.nrw.de", website: "https://www.ldi.nrw.de" },
  "Rheinland-Pfalz": { name: "Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz", anschrift: "Hintere Bleiche 34, 55116 Mainz", telefon: "06131 8920-0", email: "poststelle@datenschutz.rlp.de", website: "https://www.datenschutz.rlp.de" },
  Saarland: { name: "Unabhängiges Datenschutzzentrum Saarland, Landesbeauftragte für Datenschutz und Informationsfreiheit", anschrift: "Fritz-Dobisch-Straße 12, 66111 Saarbrücken", telefon: "0681 94781-0", email: "poststelle@datenschutz.saarland.de", website: "https://www.datenschutz.saarland.de" },
  Sachsen: { name: "Sächsische Datenschutz- und Transparenzbeauftragte", anschrift: "Maternistraße 17, 01067 Dresden", telefon: "0351 85471-101", email: "post@sdtb.sachsen.de", website: "https://www.datenschutz.sachsen.de" },
  "Sachsen-Anhalt": { name: "Landesbeauftragte für den Datenschutz Sachsen-Anhalt", anschrift: "Otto-von-Guericke-Straße 34a, 39104 Magdeburg", telefon: "0391 81803-0", email: "poststelle@lfd.sachsen-anhalt.de", website: "https://datenschutz.sachsen-anhalt.de" },
  "Schleswig-Holstein": { name: "Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein", anschrift: "Holstenstraße 98, 24103 Kiel", telefon: "0431 988-1200", email: "mail@datenschutzzentrum.de", website: "https://www.datenschutzzentrum.de" },
  Thüringen: { name: "Thüringer Landesbeauftragter für den Datenschutz und die Informationsfreiheit", anschrift: "Häßlerstraße 8, 99096 Erfurt", telefon: "0361 57-3112900", email: "poststelle@datenschutz.thueringen.de", website: "https://www.tlfdi.de" },
};

export const BUNDESLAENDER = Object.keys(AUFSICHTSBEHOERDEN);

/** Kontaktblock der Behörde für den Text; leer, wenn das Bundesland nicht bekannt ist. */
export function aufsichtText(bundesland: string): string {
  const a = AUFSICHTSBEHOERDEN[bundesland];
  return a ? [a.name, a.anschrift, `Telefon: ${a.telefon}`, `E-Mail: ${a.email}`, `Website: ${a.website}`].join("\n") : "";
}
