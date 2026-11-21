-- core-cms v0.16.0: Absicherung und Aufräumen in der Datenbank.
--
-- Einmal je Projekt im SQL-Editor von Supabase ausführen, vor oder nach dem Update auf v0.16.0 (beides geht,
-- der Code kommt auch ohne die Datei zurecht). Kann gefahrlos mehrfach laufen. Ändert keine Inhalte.
-- Voraussetzung: 0.14.0_basis.sql. Teile für Rechtstexte und Einwilligungen laufen nur, wenn es die Tabellen gibt.
--
-- 1. Rechtstexte im Daten-Export: Der Server-Zugang (service_role) durfte legal_documents nicht lesen.
-- 2. Mediathek: Ein Ordner kann nicht mehr in sich selbst oder einen eigenen Unterordner verschoben werden.
--    Prüfregel für Ordnernamen (1 bis 120 Zeichen), gilt für neue und geänderte Ordner.
-- 3. updated_at wird bei jeder Änderung automatisch gesetzt.
-- 4. Speicheranzeige: belegter Speicher in einer Abfrage statt Ordner für Ordner (core_storage_usage).
-- 5. Bucket „images“: öffentlich abrufbar bleiben die Dateien, die Liste aller Dateien sehen nur noch Admins.
--    Größen- und Typgrenze (50 MB; Bilder, PDF, MP4/WebM), nur wenn das Projekt noch keine eigene gesetzt hat.
-- 6. Posteingang: Index für die Sortierung nach Datum (seitenweises Laden).
-- 7. Einwilligungen: Index für die Zählung je Entscheidung, fester search_path für consent_guard.

-- 1 ───────────── Rechtstexte für den Server-Zugang (Daten-Export)
do $$
begin
  if to_regclass('public.legal_documents') is not null then
    grant all on public.legal_documents to service_role;
  end if;
end $$;

-- 2 ───────────── Mediathek: keine Ordner-Kreise
create or replace function public.core_media_folder_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.parent_id = new.id then
    raise exception 'Ein Ordner kann nicht in sich selbst liegen.' using errcode = 'check_violation';
  end if;
  if exists (
    with recursive vorfahren(id, parent_id, tiefe) as (
      select f.id, f.parent_id, 1 from public.media_folders f where f.id = new.parent_id
      union all
      select f.id, f.parent_id, v.tiefe + 1 from public.media_folders f join vorfahren v on f.id = v.parent_id where v.tiefe < 100
    )
    select 1 from vorfahren where id = new.id
  ) then
    raise exception 'Ein Ordner kann nicht in einen eigenen Unterordner verschoben werden.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists media_folders_guard on public.media_folders;
create trigger media_folders_guard before insert or update of parent_id on public.media_folders
  for each row execute function public.core_media_folder_guard();

alter table public.media_folders drop constraint if exists media_folders_name_check;
alter table public.media_folders add constraint media_folders_name_check
  check (char_length(btrim(name)) between 1 and 120) not valid;

-- 3 ───────────── updated_at automatisch
create or replace function public.core_set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['site_settings', 'email_settings', 'media_folders', 'media_files', 'submissions', 'legal_documents'] loop
    if to_regclass('public.' || t) is not null
       and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'updated_at') then
      execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
      execute format('create trigger %I before update on public.%I for each row execute function public.core_set_updated_at()', t || '_updated_at', t);
    end if;
  end loop;
end $$;

-- 4 ───────────── Belegter Speicher (alle Buckets), nur für angemeldete Admins
create or replace function public.core_storage_usage() returns table (used_bytes bigint, file_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint, count(*)::bigint
    from storage.objects o
    where o.name not like '%/.emptyFolderPlaceholder' and o.name <> '.emptyFolderPlaceholder';
end;
$$;
revoke all on function public.core_storage_usage() from public, anon;
grant execute on function public.core_storage_usage() to authenticated, service_role;

-- 5 ───────────── Bucket „images“
drop policy if exists "Public read images bucket" on storage.objects;
drop policy if exists "Authenticated read images bucket" on storage.objects;
create policy "Authenticated read images bucket" on storage.objects for select to authenticated using (bucket_id = 'images');

update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/*', 'application/pdf', 'video/mp4', 'video/webm']
 where id = 'images' and file_size_limit is null and allowed_mime_types is null;

-- 6 ───────────── Posteingang
create index if not exists submissions_created_idx on public.submissions (created_at desc);

-- 7 ───────────── Einwilligungen
do $$
begin
  if to_regclass('public.consent_events') is not null then
    create index if not exists consent_events_action_idx on public.consent_events (action);
  end if;
  if to_regprocedure('public.consent_guard()') is not null then
    alter function public.consent_guard() set search_path = '';
  end if;
end $$;
