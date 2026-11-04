-- core-cms v0.12.0: Rechtstexte (z. B. Datenschutzerklärung) im Admin bearbeiten.
-- Einmal pro Projekt im Supabase-SQL-Editor ausführen (oder als Migration übernehmen).
-- Pro Dokument eine Zeile (slug, z. B. 'datenschutz'). Öffentlich lesbar, nur angemeldete Admins dürfen schreiben.
-- blocks: Liste von { "t": "h1" | "h2" | "h3" | "p" | "li", "text": "…" }.

create table if not exists public.legal_documents (
  slug text primary key,
  title text not null default '',
  version text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  -- Nur für das Impressum als Formular (Angaben je Abschnitt und Feld); blocks enthält dann den daraus erzeugten Text
  data jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Falls die Tabelle schon ohne Spalte „data“ angelegt wurde:
alter table public.legal_documents add column if not exists data jsonb;

-- Rechte auf Tabellenebene: Neuere Supabase-Projekte vergeben sie nicht mehr automatisch.
-- Ohne diese Zeilen scheitert das Speichern und die Website sieht den gespeicherten Text nicht.
grant select on public.legal_documents to anon;
grant select, insert, update, delete on public.legal_documents to authenticated;

alter table public.legal_documents enable row level security;

drop policy if exists "Allow public read access for legal_documents" on public.legal_documents;
create policy "Allow public read access for legal_documents"
  on public.legal_documents for select to public using (true);

drop policy if exists "Allow auth management for legal_documents" on public.legal_documents;
create policy "Allow auth management for legal_documents"
  on public.legal_documents for all to authenticated using (true) with check (true);
