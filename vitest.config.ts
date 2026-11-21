import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests für Logik, Server-Endpunkt und Oberfläche des Einwilligungs-Features (tests/consent).
// Komponenten-Tests laufen mit jsdom (Kopfzeile "@vitest-environment jsdom" in der Datei).
export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
  },
  esbuild: { jsx: "automatic" },
  // In Next.js liefert das Framework "server-only" mit, in Tests ein leeres Modul
  resolve: { alias: { "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)) } },
});
