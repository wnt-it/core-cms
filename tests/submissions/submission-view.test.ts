import { describe, expect, it } from "vitest";
import type { Submission } from "../../src/supabase/types";
import { appendUnique, baseType, countFormTypes, filterSubmissions, mailtoHref, senderOf, statusOf } from "../../src/submissions/submission-view";

const sub = (over: Partial<Submission>): Submission =>
  ({ id: "1", type: "Kontakt", status: "Neu", name: null, email: null, phone: null, company: null, subject: null, message: null, source_page: null, created_at: "2026-01-01T10:00:00Z", ...over }) as Submission;

describe("Posteingang-Helfer", () => {
  it("Absender: Name, sonst E-Mail, sonst Hinweis", () => {
    expect(senderOf(sub({ name: " Anna ", email: "a@x.de" }))).toBe("Anna");
    expect(senderOf(sub({ email: "a@x.de" }))).toBe("a@x.de");
    expect(senderOf(sub({}))).toBe("Ohne Namen");
  });

  it("Formular ohne Zusatz und Anzahl je Formular", () => {
    expect(baseType("Kontakt · Startseite")).toBe("Kontakt");
    const list = [sub({ id: "1", type: "Kontakt · A" }), sub({ id: "2", type: "Kontakt" }), sub({ id: "3", type: "Angebot" })];
    expect(countFormTypes(list)).toEqual([["Angebot", 1], ["Kontakt", 2]]);
  });

  it("Filter nach Formular, Status und Text", () => {
    const list = [
      sub({ id: "1", type: "Kontakt", status: "Neu", message: "Hallo Welt" }),
      sub({ id: "2", type: "Angebot", status: "Erledigt", company: "Muster GmbH" }),
    ];
    expect(filterSubmissions(list, { query: "", type: "all", status: "all" })).toHaveLength(2);
    expect(filterSubmissions(list, { query: "welt", type: "all", status: "all" }).map((s) => s.id)).toEqual(["1"]);
    expect(filterSubmissions(list, { query: "muster", type: "Angebot", status: "Erledigt" }).map((s) => s.id)).toEqual(["2"]);
    expect(filterSubmissions(list, { query: "", type: "Kontakt", status: "Erledigt" })).toEqual([]);
  });

  it("Unbekannter Status erscheint wie „Neu“, mailto nur mit E-Mail", () => {
    expect(statusOf("Archiv").value).toBe("Neu");
    expect(mailtoHref(sub({}))).toBeNull();
    expect(mailtoHref(sub({ email: "a@x.de", subject: "Frage & Antwort" }))).toBe("mailto:a@x.de?subject=Re: Frage%20%26%20Antwort");
  });

  it("Nachladen hängt nur neue Einträge an", () => {
    expect(appendUnique([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }]).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});
