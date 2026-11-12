-- core-cms v0.15.0: Posteingang ohne Pflichtfelder, kein direkter Zugriff für Besucher, Anhänge
--
-- Einmal je Projekt im SQL-Editor von Supabase ausführen, NACHDEM die Website mit v0.15.0 (oder neuer) live ist.
-- Grund: Teil 3 entzieht Besuchern das direkte Eintragen. Eine Website mit älterem Core speichert noch auf diesem Weg
-- und bekäme bis zum Update keine Anfragen mehr. v0.15.0 speichert über den Server und braucht diese Datei erst
-- für Anhänge und Formulare ohne Name/E-Mail. Voraussetzung: SUPABASE_SERVICE_ROLE_KEY ist in Vercel gesetzt.
-- Kann gefahrlos mehrfach laufen. Bestehende Anfragen bleiben unverändert.
--
-- 1. Name und E-Mail sind keine Pflicht mehr, welche Felder Pflicht sind, legt das Formular fest.
-- 2. Bezeichnungen eigener Felder (field_labels) für Posteingang und E-Mail.
-- 3. Besucher können Anfragen weder lesen noch direkt eintragen. Gespeichert wird nur noch über den Server
--    der Website (Service-Role), damit niemand am Spam-Schutz vorbei schreibt. Lesen dürfen nur angemeldete Admins.
-- 4. Anhänge: Tabelle submission_files und privater Speicherbereich "anfragen" (kein öffentlicher Link).

-- 1 + 2
alter table public.submissions alter column name drop not null;
alter table public.submissions alter column email drop not null;
alter table public.submissions add column if not exists field_labels jsonb;

-- 3: alle Regeln für Besucher (anon/public) auf submissions entfernen, egal wie sie heißen
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'submissions'
      and (roles && array['anon', 'public']::name[])
  loop
    execute format('drop policy %I on public.submissions', p.policyname);
  end loop;
end $$;

revoke all on public.submissions from anon;
alter table public.submissions enable row level security;
grant select, insert, update, delete on public.submissions to authenticated;
grant all on public.submissions to service_role;
drop policy if exists "Allow authenticated full access on submissions" on public.submissions;
create policy "Allow authenticated full access on submissions" on public.submissions
  for all to authenticated using (true) with check (true);

-- 4: Anhänge
create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  path text not null unique,
  name text not null,
  size bigint not null,
  mime text not null,
  status text not null default 'ausstehend' check (status in ('ausstehend', 'ok', 'abgelehnt')),
  created_at timestamptz not null default now()
);
create index if not exists submission_files_submission_idx on public.submission_files (submission_id);

revoke all on public.submission_files from anon;
grant select, delete on public.submission_files to authenticated;
grant all on public.submission_files to service_role;
alter table public.submission_files enable row level security;
drop policy if exists "Admins read submission_files" on public.submission_files;
create policy "Admins read submission_files" on public.submission_files for select to authenticated using (true);
drop policy if exists "Admins delete submission_files" on public.submission_files;
create policy "Admins delete submission_files" on public.submission_files for delete to authenticated using (true);

-- Privater Speicherbereich: nur PDF, JPG, PNG, höchstens 25 MB je Datei (die Formulare legen engere Grenzen fest).
-- Hochladen geht nur über einmalige Upload-Adressen, die der Server nach der Prüfung ausgibt.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anfragen', 'anfragen', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins read anfragen bucket" on storage.objects;
create policy "Admins read anfragen bucket" on storage.objects for select to authenticated using (bucket_id = 'anfragen');
drop policy if exists "Admins delete anfragen bucket" on storage.objects;
create policy "Admins delete anfragen bucket" on storage.objects for delete to authenticated using (bucket_id = 'anfragen');
