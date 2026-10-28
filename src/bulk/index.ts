// Mehrfachbearbeitung (ab v0.10.0): mehrere Einträge einer Liste auswählen und
// ein Feld für alle auf einmal ändern oder sie gemeinsam löschen.
// Browser-Teil hier, Server-Teil (getBulkClientConfig, runBulk) in "./server".

export * from "./types";
export { useBulkSelection } from "./useBulkSelection";
export type { BulkSelection } from "./useBulkSelection";
export { BulkCheckbox, BulkSelectAll, BulkSelectAllRow, bulkCellClass } from "./BulkCheckbox";
export { BulkBar } from "./BulkBar";
export type { BulkCustomEditor } from "./BulkBar";
