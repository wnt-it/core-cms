-- core-cms v0.18.0: Schalter „Zertifikat des Mailservers nicht prüfen“.
--
-- Einmal je Projekt im SQL-Editor von Supabase ausführen, vor oder nach dem Update auf v0.18.0 (beides geht:
-- ältere Versionen lesen die Spalte nicht; v0.18.0 ohne die Spalte prüft das Zertifikat immer und zeigt in den
-- Einstellungen statt des Schalters einen Hinweis). Kann gefahrlos mehrfach laufen. Ändert keine Inhalte.
-- Voraussetzung: 0.14.0_basis.sql (Tabelle email_settings).
--
-- Standard false = Zertifikat wird geprüft. true nur für eigene Mailserver mit selbst ausgestelltem Zertifikat,
-- vom Kunden selbst im Admin gesetzt (Einstellungen → E-Mail & SMTP → Server-Einstellungen).
-- Liegt in email_settings: nur für angemeldete Admins und den Server lesbar, nie öffentlich, nie im Daten-Export.

alter table public.email_settings
  add column if not exists smtp_skip_cert_check boolean not null default false;
