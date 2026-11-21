import { describe, expect, it } from "vitest";
import { isMissingColumn, isMissingTable } from "../../src/supabase/db-errors";

describe("Fehlende Migration erkennen", () => {
  it("Tabelle", () => {
    expect(isMissingTable({ code: "42P01" })).toBe(true);
    expect(isMissingTable({ code: "PGRST205", message: "Could not find the table 'public.x' in the schema cache" })).toBe(true);
    expect(isMissingTable({ message: 'relation "public.consent_events" does not exist' })).toBe(true);
    expect(isMissingTable({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingTable({ message: "Could not find the 'data' column of 'legal_documents' in the schema cache" })).toBe(false);
  });
  it("Spalte", () => {
    expect(isMissingColumn({ code: "42703" })).toBe(true);
    expect(isMissingColumn({ message: "Could not find the 'data' column of 'legal_documents' in the schema cache" })).toBe(true);
    expect(isMissingColumn(null)).toBe(false);
  });
});
