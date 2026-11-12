-- core-cms v0.12.0: Pop-up-Einstellungen (Zeitraum, Häufigkeit, Verzögerung, Seiten).
-- Einmal pro Projekt im Supabase-SQL-Editor ausführen (oder als Migration übernehmen). Voraussetzung: sql/0.9.0_site_popup.sql.
-- Die Spalten liegen in site_settings (öffentlich lesbar), Zeile id = 'general'. Die Voreinstellungen entsprechen dem bisherigen
-- Verhalten (einmal pro Besuch, ohne Zeitraum, sofort) und gelten auf allen Seiten, auf denen das Pop-up eingebunden ist.

alter table public.site_settings
  add column if not exists popup_from date,
  add column if not exists popup_until date,
  add column if not exists popup_frequency text not null default 'session',
  add column if not exists popup_delay_seconds integer not null default 0,
  add column if not exists popup_pages text not null default 'all',
  add column if not exists popup_paths text;

alter table public.site_settings drop constraint if exists site_settings_popup_frequency_check;
alter table public.site_settings add constraint site_settings_popup_frequency_check
  check (popup_frequency in ('session', 'always', 'day', 'week'));

alter table public.site_settings drop constraint if exists site_settings_popup_pages_check;
alter table public.site_settings add constraint site_settings_popup_pages_check
  check (popup_pages in ('all', 'home', 'custom'));

alter table public.site_settings drop constraint if exists site_settings_popup_delay_check;
alter table public.site_settings add constraint site_settings_popup_delay_check
  check (popup_delay_seconds between 0 and 60);
