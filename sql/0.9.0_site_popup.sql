-- core-cms v0.9.0: Pop-up als Core-Funktion.
-- Einmal pro Projekt im Supabase-SQL-Editor ausführen (oder als Migration übernehmen).
-- Die Spalten liegen in site_settings (öffentlich lesbar), Zeile id = 'general'.

alter table public.site_settings
  add column if not exists popup_enabled boolean not null default false,
  add column if not exists popup_image_url text,
  add column if not exists popup_image_alt text;
