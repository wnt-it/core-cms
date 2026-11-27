-- core-cms v0.19.0: Versandart „Microsoft 365“ (Microsoft Graph mit App-Registrierung, ohne Passwort).
--
-- Einmal je Projekt im SQL-Editor von Supabase ausführen, vor oder nach dem Update auf v0.19.0 (beides geht:
-- ältere Versionen lesen die Spalten nicht und senden weiter per SMTP; v0.19.0 ohne die Spalten bietet nur SMTP an
-- und zeigt in den Einstellungen einen Hinweis). Kann gefahrlos mehrfach laufen. Ändert keine Inhalte, entfernt nichts.
-- Voraussetzung: 0.14.0_basis.sql (Tabelle email_settings).
--
-- Achtung, gemeinsame Datenbank von Vorschau und Live-Seite: Wer im Admin der Vorschau (v0.19.0) auf „Microsoft 365“
-- umstellt, ändert nichts an der Live-Seite mit älterer Version. Die sendet weiter mit den SMTP-Angaben (falls vorhanden).
--
-- Liegt in email_settings: nur für angemeldete Admins und den Server lesbar, nie öffentlich, nie im Daten-Export.
-- ms_client_secret ist wie smtp_pass mit ENCRYPTION_KEY verschlüsselt (AES-256), nie im Klartext.

alter table public.email_settings
  add column if not exists mail_transport text not null default 'smtp',
  add column if not exists ms_tenant_id text,
  add column if not exists ms_client_id text,
  add column if not exists ms_client_secret text,
  add column if not exists ms_sender text,
  add column if not exists ms_secret_expires_at date;

-- Nur bekannte Versandarten (mehrfach ausführbar)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'email_settings_mail_transport_check') then
    alter table public.email_settings
      add constraint email_settings_mail_transport_check check (mail_transport in ('smtp', 'microsoft365'));
  end if;
end $$;

comment on column public.email_settings.mail_transport is 'Versandart: smtp oder microsoft365 (core-cms v0.19.0)';
comment on column public.email_settings.ms_client_secret is 'Client-Secret der App-Registrierung, verschlüsselt mit ENCRYPTION_KEY';
comment on column public.email_settings.ms_secret_expires_at is 'Ablaufdatum des Client-Secrets (höchstens 24 Monate), für die Erinnerung im Admin';
