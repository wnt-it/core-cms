-- core-cms v0.14.0: Grundschema für ein neues Projekt mit core-cms.
-- Einmal pro neuem Supabase-Projekt ausführen, danach die übrigen Dateien in sql/ in Versionsreihenfolge
-- (0.9.0_site_popup, 0.12.0_site_popup_options, 0.12.0_legal_documents, bei Bedarf 0.14.0_consent,
-- 0.15.0_posteingang, 0.16.0_haertung).
-- Bestehende Projekte haben diese Tabellen schon. Die Datei legt nichts doppelt an und gibt Besuchern
-- keine Rechte zurück, die eine spätere Datei entzogen hat (Stand ab v0.15.0: Anfragen nur über den Server).
--
-- site_settings:  Name, Logo, Kontakt (öffentlich lesbar), Zeile id = 'general'
-- email_settings: SMTP-Zugang (nur Admins und Server, nie öffentlich)
-- media_folders / media_files: Mediathek, Dateien im öffentlichen Bucket „images“
-- submissions:    Posteingang (Besucher haben keinen Zugriff, gespeichert wird über den Server der Website)

create table if not exists public.site_settings (
  id text primary key default 'general',
  site_name text not null default '',
  site_tagline text,
  site_description text,
  logo_url text,
  favicon_url text,
  contact_email text,
  contact_phone text,
  address_street text,
  address_city text,
  social_links jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.email_settings (
  id text primary key default 'general',
  smtp_host text,
  smtp_port text,
  smtp_user text,
  smtp_pass text,
  smtp_from_name text,
  smtp_from_email text,
  smtp_recipient text,
  updated_at timestamptz default now()
);

create table if not exists public.media_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.media_folders (id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists media_folders_parent_id_idx on public.media_folders (parent_id);

create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  storage_path text not null unique,
  url text not null,
  size bigint default 0,
  mime_type text,
  folder_id uuid references public.media_folders (id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists media_files_folder_id_idx on public.media_files (folder_id);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'Kontakt',
  name text,
  email text,
  phone text,
  company text,
  subject text,
  message text,
  source_page text,
  source_url text,
  status text not null default 'Neu',
  metadata jsonb,
  field_labels jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists submissions_status_created_idx on public.submissions (status, created_at desc);

-- Rechte auf Tabellenebene (neuere Supabase-Projekte vergeben sie nicht mehr automatisch)
grant select on public.site_settings, public.media_folders, public.media_files to anon;
grant select, insert, update, delete on public.site_settings, public.email_settings, public.media_folders,
  public.media_files, public.submissions to authenticated;
grant all on public.site_settings, public.email_settings, public.media_folders, public.media_files,
  public.submissions to service_role;
revoke all on public.email_settings, public.submissions from anon;

alter table public.site_settings enable row level security;
alter table public.email_settings enable row level security;
alter table public.media_folders enable row level security;
alter table public.media_files enable row level security;
alter table public.submissions enable row level security;

drop policy if exists "Public can read site_settings" on public.site_settings;
create policy "Public can read site_settings" on public.site_settings for select to public using (true);
drop policy if exists "Allow authenticated full access on site_settings" on public.site_settings;
create policy "Allow authenticated full access on site_settings" on public.site_settings for all to authenticated using (true) with check (true);

drop policy if exists "Allow authenticated full access to email_settings" on public.email_settings;
create policy "Allow authenticated full access to email_settings" on public.email_settings for all to authenticated using (true) with check (true);

drop policy if exists "Allow public read on media_folders" on public.media_folders;
create policy "Allow public read on media_folders" on public.media_folders for select to public using (true);
drop policy if exists "Allow authenticated full access on media_folders" on public.media_folders;
create policy "Allow authenticated full access on media_folders" on public.media_folders for all to authenticated using (true) with check (true);

drop policy if exists "Allow public read on media_files" on public.media_files;
create policy "Allow public read on media_files" on public.media_files for select to public using (true);
drop policy if exists "Allow authenticated full access on media_files" on public.media_files;
create policy "Allow authenticated full access on media_files" on public.media_files for all to authenticated using (true) with check (true);

drop policy if exists "Allow public insert on submissions" on public.submissions;
drop policy if exists "Allow authenticated full access on submissions" on public.submissions;
create policy "Allow authenticated full access on submissions" on public.submissions for all to authenticated using (true) with check (true);

-- Öffentlicher Bucket für die Mediathek
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict (id) do nothing;

-- Dateien sind über ihre öffentliche Adresse abrufbar (öffentlicher Bucket). Die Liste aller Dateien sehen nur Admins.
drop policy if exists "Public read images bucket" on storage.objects;
drop policy if exists "Authenticated read images bucket" on storage.objects;
create policy "Authenticated read images bucket" on storage.objects for select to authenticated using (bucket_id = 'images');
drop policy if exists "Authenticated insert images bucket" on storage.objects;
create policy "Authenticated insert images bucket" on storage.objects for insert to authenticated with check (bucket_id = 'images');
drop policy if exists "Authenticated update images bucket" on storage.objects;
create policy "Authenticated update images bucket" on storage.objects for update to authenticated
  using (bucket_id = 'images') with check (bucket_id = 'images');
drop policy if exists "Authenticated delete images bucket" on storage.objects;
create policy "Authenticated delete images bucket" on storage.objects for delete to authenticated using (bucket_id = 'images');

-- Startzeile für die Einstellungen
insert into public.site_settings (id) values ('general') on conflict (id) do nothing;
insert into public.email_settings (id) values ('general') on conflict (id) do nothing;
