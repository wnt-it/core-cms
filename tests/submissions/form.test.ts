import { beforeEach, describe, expect, it } from "vitest";
import { defineForm, sniffType, storageFileName, validateSubmission } from "../../src/submissions/form";
import { checkGuard, resetGuard } from "../../src/submissions/guard";

const bewerbung = defineForm({
  type: "Bewerbung",
  fields: {
    name: { label: "Name", required: true },
    email: { label: "E-Mail", required: true },
    stelle: { label: "Stelle" },
    wunschtermin: { label: "Wunschtermin" },
    message: { label: "Anschreiben" },
  },
  attachments: { maxFiles: 2, maxSizeMb: 5, types: ["pdf"] },
});

const feedback = defineForm({ type: "Feedback", fields: { message: { label: "Ihre Meinung" }, note: { label: "Note" } } });

describe("Formular-Definition", () => {
  it("lehnt reservierte und ungültige Feldnamen ab", () => {
    expect(() => defineForm({ type: "X", fields: { website: { label: "W" } } })).toThrow(/reserviert/);
    expect(() => defineForm({ type: "X", fields: { "Mein Feld": { label: "W" } } })).toThrow(/Feldname/);
  });
});

describe("Prüfung der Eingaben", () => {
  it("kennt keine Pflichtfelder aus dem Core: Formular ohne Name und E-Mail geht", () => {
    const r = validateSubmission(feedback, { message: "Super", note: "1" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.columns).toEqual({ message: "Super" });
      expect(r.value.metadata).toEqual({ note: "1" });
      expect(r.value.labels).toEqual({ message: "Ihre Meinung", note: "Note" });
    }
  });

  it("prüft Pflichtfelder des Formulars und das E-Mail-Format", () => {
    expect(validateSubmission(bewerbung, { email: "a@b.de" })).toMatchObject({ ok: false, field: "name" });
    expect(validateSubmission(bewerbung, { name: "A", email: "kaputt" })).toMatchObject({ ok: false, field: "email" });
  });

  it("speichert nur definierte Felder, Listen werden verbunden", () => {
    const r = validateSubmission(bewerbung, { name: "A", email: "A@B.de", stelle: ["Lager", "Büro"], hack: "x" });
    expect(r.ok && r.value.metadata).toEqual({ stelle: "Lager, Büro" });
    expect(r.ok && r.value.columns.email).toBe("a@b.de");
  });

  it("begrenzt Länge und Links", () => {
    expect(validateSubmission(feedback, { note: "x".repeat(201) })).toMatchObject({ ok: false, field: "note" });
    expect(validateSubmission(feedback, { message: "http://a ".repeat(6) })).toMatchObject({ ok: false, field: "message" });
  });

  it("prüft angekündigte Anhänge gegen die Regeln", () => {
    const ok = { name: "A", email: "a@b.de" };
    expect(validateSubmission(feedback, { files: [{ name: "a.pdf", size: 10, type: "application/pdf" }] })).toMatchObject({ ok: false });
    expect(validateSubmission(bewerbung, { ...ok, files: [{ name: "a.png", size: 10, type: "image/png" }] })).toMatchObject({ ok: false, field: "files" });
    expect(validateSubmission(bewerbung, { ...ok, files: [{ name: "a.pdf", size: 6 * 1024 * 1024, type: "application/pdf" }] })).toMatchObject({ ok: false });
    const three = Array.from({ length: 3 }, (_, i) => ({ name: `${i}.pdf`, size: 10, type: "application/pdf" }));
    expect(validateSubmission(bewerbung, { ...ok, files: three })).toMatchObject({ ok: false });
    const r = validateSubmission(bewerbung, { ...ok, files: [{ name: "cv.pdf", size: 10, type: "application/pdf" }] });
    expect(r.ok && r.value.files).toHaveLength(1);
  });
});

describe("Spam-Schutz", () => {
  beforeEach(() => resetGuard());

  it("Bots bekommen eine stille Erfolgsmeldung", () => {
    expect(checkGuard({ website: "spam", form_age: "9000" }, "1.1.1.1")).toEqual({ ok: false, silent: true });
    expect(checkGuard({ website: "", form_age: "100" }, "1.1.1.1")).toEqual({ ok: false, silent: true });
  });

  it("ohne Zeitmessung Hinweis zum Neuladen, danach Begrenzung je Adresse", () => {
    expect(checkGuard({}, "2.2.2.2")).toMatchObject({ ok: false, silent: false });
    for (let i = 0; i < 5; i++) expect(checkGuard({ form_age: "5000" }, "3.3.3.3")).toEqual({ ok: true });
    expect(checkGuard({ form_age: "5000" }, "3.3.3.3")).toMatchObject({ ok: false, silent: false });
  });
});

describe("Anhänge", () => {
  it("erkennt den echten Dateityp am Inhalt", () => {
    expect(sniffType(new TextEncoder().encode("%PDF-1.7 ..."))).toBe("application/pdf");
    expect(sniffType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffType(new TextEncoder().encode("MZ\x90\x00"))).toBeNull();
    expect(sniffType(new TextEncoder().encode("<html>"))).toBeNull();
  });

  it("macht sichere Dateinamen mit passender Endung", () => {
    expect(storageFileName("../../Lebenslauf Müller.exe", "application/pdf")).toBe("Lebenslauf-Muller.pdf");
    expect(storageFileName("...", "image/png")).toBe("datei.png");
  });
});
