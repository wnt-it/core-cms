-- core-cms v0.14.0: Einwilligungsprotokoll für den Cookie-Banner / die Zwei-Klick-Lösung.
-- Einmal pro Projekt im Supabase-SQL-Editor ausführen (oder als Migration übernehmen).
-- Nur nötig in Projekten, die das Einwilligungs-Feature einbinden (core-cms/src/consent).
--
-- consent_configs: Textstand. Was genau hat der Besucher gesehen? Pro Stand eine Zeile, unveränderlich.
-- consent_events:  Protokoll, eine Zeile pro Entscheidung. Nur anhängen. Ohne ID, ohne IP-Adresse, ohne Browserkennung.
-- Geschrieben wird nur über den Server (Service-Role) durch die Route /api/consent. Besucher haben keinen Zugriff.
-- Lesen dürfen nur angemeldete Admins. Ändern geht gar nicht, löschen nur über consent_cleanup() nach Ablauf der Frist.

create table if not exists public.consent_configs (
  hash        text primary key,
  created_at  timestamptz not null default now(),
  snapshot    jsonb not null
);

create table if not exists public.consent_events (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  action        text not null check (action in ('accept_all', 'reject_all', 'custom')),
  trigger       text not null check (trigger in ('banner', 'settings', 'embed')),
  choices       jsonb not null,
  config_hash   text not null references public.consent_configs (hash),
  core_version  text not null,
  page_path     text,
  -- Platz für spätere Erweiterungen, ohne die Tabelle ändern zu müssen (z. B. eine optionale ID, falls das einmal freigegeben wird)
  extra         jsonb
);

create index if not exists consent_events_created_at_idx on public.consent_events (created_at desc);
create index if not exists consent_events_config_hash_idx on public.consent_events (config_hash);

-- Rechte auf Tabellenebene (neuere Supabase-Projekte vergeben sie nicht mehr automatisch)
revoke all on public.consent_events, public.consent_configs from anon, authenticated;
grant select on public.consent_events, public.consent_configs to authenticated;
grant select, insert on public.consent_events, public.consent_configs to service_role;

alter table public.consent_events enable row level security;
alter table public.consent_configs enable row level security;

drop policy if exists "consent_events lesen (Admins)" on public.consent_events;
create policy "consent_events lesen (Admins)"
  on public.consent_events for select to authenticated using (true);

drop policy if exists "consent_configs lesen (Admins)" on public.consent_configs;
create policy "consent_configs lesen (Admins)"
  on public.consent_configs for select to authenticated using (true);

-- Schutz vor Änderungen: Ändern ist nie erlaubt, Löschen nur aus consent_cleanup().
create or replace function public.consent_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Das Einwilligungsprotokoll darf nicht geändert werden.';
  end if;
  if tg_op = 'DELETE' and coalesce(current_setting('app.consent_cleanup', true), '') <> 'on' then
    raise exception 'Das Einwilligungsprotokoll darf nur über consent_cleanup() gelöscht werden.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists consent_events_guard on public.consent_events;
create trigger consent_events_guard before update or delete on public.consent_events
  for each row execute function public.consent_guard();

drop trigger if exists consent_configs_guard on public.consent_configs;
create trigger consent_configs_guard before update or delete on public.consent_configs
  for each row execute function public.consent_guard();

-- Aufräumen nach Ablauf der Frist: behalten wird das laufende Jahr plus die letzten p_years Jahre
-- (Standard 3 Jahre ab Ende des Jahres der Entscheidung). Liefert die Zahl der gelöschten Protokolleinträge.
create or replace function public.consent_cleanup(p_years integer default 3) returns integer
language plpgsql security definer set search_path = public as $$
declare
  cutoff timestamptz := date_trunc('year', now()) - make_interval(years => p_years);
  removed integer;
begin
  if p_years < 1 then
    raise exception 'Die Aufbewahrung muss mindestens 1 Jahr betragen.';
  end if;
  perform set_config('app.consent_cleanup', 'on', true);
  delete from public.consent_events where created_at < cutoff;
  get diagnostics removed = row_count;
  -- Textstände, die kein Eintrag mehr braucht und die älter als die Frist sind
  delete from public.consent_configs c
   where c.created_at < cutoff
     and not exists (select 1 from public.consent_events e where e.config_hash = c.hash);
  return removed;
end;
$$;

revoke all on function public.consent_cleanup(integer) from public, anon;
grant execute on function public.consent_cleanup(integer) to authenticated;
