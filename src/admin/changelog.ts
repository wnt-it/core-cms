// Single Source of Truth für die Core-Version und den Changelog, der im Admin
// unter /admin/version angezeigt wird. Beim Release VOR dem Tag pflegen:
// CORE_VERSION erhöhen, neuen Eintrag ganz oben in CORE_CHANGELOG ergänzen
// und die Version in package.json angleichen.

export type ChangeType = "feature" | "fix" | "security" | "docs";

export interface ChangelogEntry {
  version: string;
  /** ISO-Datum (YYYY-MM-DD) */
  date: string;
  changes: { type: ChangeType; text: string }[];
}

export const CORE_VERSION = "0.6.0";

/** Neueste Version zuerst. */
export const CORE_CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.6.0",
    date: "2026-10-05",
    changes: [
      { type: "feature", text: "Neue Admin-Seite „Core-Version“: zeigt die installierte Core-Version und den Changelog." },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-10-04",
    changes: [
      { type: "fix", text: "Formularversand nutzt nur noch die im Admin hinterlegten E-Mail-Einstellungen – keine versteckten Fallbacks mehr." },
      { type: "docs", text: "Dokumentation an den reinen Admin-SMTP-Betrieb angepasst." },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-09-27",
    changes: [
      { type: "feature", text: "Neue Admin-Seiten des Core erscheinen automatisch in allen Projekten (coreAdminPages)." },
    ],
  },
  {
    version: "0.3.1",
    date: "2026-09-26",
    changes: [
      { type: "security", text: "SMTP-Zugangsdaten werden nicht mehr in öffentlich lesbaren Einstellungen gespeichert." },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-25",
    changes: [
      { type: "feature", text: "„Mein Konto“: Admins können ihre eigene E-Mail-Adresse und ihr Passwort ändern." },
    ],
  },
];
