// Erkennt Datenbankfehler, die auf eine fehlende Migration hindeuten (Tabelle oder Spalte gibt es noch nicht).
// Vorher stand dieselbe Prüfung mit leicht unterschiedlichen Mustern in mehreren Dateien.

type DbError = { code?: string | null; message?: string | null } | null | undefined;

/** Tabelle fehlt: Postgres 42P01, PostgREST PGRST205 oder eine Meldung mit „does not exist“ bzw. „schema cache“. */
export function isMissingTable(error: DbError): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = error.message ?? "";
  return /relation .* does not exist|could not find the table|schema cache/i.test(msg) && !/column/i.test(msg);
}

/** Spalte fehlt: Postgres 42703, PostgREST PGRST204 oder eine Meldung „column … does not exist / schema cache“. */
export function isMissingColumn(error: DbError): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /column/i.test(error.message ?? "") && /does not exist|schema cache/i.test(error.message ?? "");
}
