-- core-cms v0.17.0: Empfänger je Formular.
--
-- Einmal je Projekt im SQL-Editor von Supabase ausführen, vor oder nach dem Update auf v0.17.0 (beides geht:
-- ohne die Spalte gehen alle Anfragen wie bisher an den „Empfänger für Anfragen“, die Einstellungsseite zeigt
-- dann einen Hinweis statt der Eingabefelder). Kann gefahrlos mehrfach laufen. Ändert keine Inhalte.
-- Voraussetzung: 0.14.0_basis.sql (Tabelle email_settings).
--
-- form_recipients: { "<Formular-Art>": "a@x.de, b@x.de" }. Schlüssel ist die Formular-Art wie im Posteingang
-- (z. B. „Bewerbung“ oder „Kontakt · Abteilung“) oder ihre Gruppe vor „ · “ (z. B. „Kontakt“).
-- Liegt in email_settings: nur für angemeldete Admins und den Server lesbar, nie öffentlich, nie im Daten-Export.

alter table public.email_settings
  add column if not exists form_recipients jsonb not null default '{}'::jsonb;

alter table public.email_settings drop constraint if exists email_settings_form_recipients_check;
alter table public.email_settings add constraint email_settings_form_recipients_check
  check (jsonb_typeof(form_recipients) = 'object');
