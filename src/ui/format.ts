// Einheitliche Größenangaben im Admin: deutsch, mit Komma („1,5 MB“), höchstens `decimals` Nachkommastellen.

const UNITS = ["Bytes", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Bytes";
  const i = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: i === 0 ? 0 : Math.max(0, decimals) })} ${UNITS[i]}`;
}
