-- Mega Siddur commentary layer.
-- Applied to project qukziojymwlvmrzapgyo as migration "create_siddur_commentary".
-- Reads go through the anon key (RLS: published rows only); writes go through
-- /api/mega-siddur-commentary with the service-role key, gated on a passcode.

create table if not exists public.siddur_commentary (
  id            bigint generated always as identity primary key,
  ref           text,                              -- full Sefaria section ref, e.g. 'Siddur Ashkenaz, Weekday, Shacharit, Amidah, Patriarchs'
  segment       integer check (segment is null or segment > 0),  -- paragraph within the section; null = whole section
  prayer_names  text[] not null default '{}',      -- lowercase leaf names this note follows across services & nusachim, e.g. {'aleinu','alenu'}
  anchor_text   text,                              -- the Hebrew words being commented on
  kind          text not null default 'commentary'
                check (kind in ('commentary','halacha','history','kavanah','source','language','personal','music')),
  title         text,
  body          text not null,
  author        text,
  source        text,                              -- book / paper / shiur
  source_pages  text,
  source_url    text,
  tags          text[] not null default '{}',
  sort_order    integer not null default 0,
  published     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint siddur_commentary_has_target check (ref is not null or cardinality(prayer_names) > 0)
);

comment on table public.siddur_commentary is 'Mega Siddur commentary layer. Anchored either to an exact Sefaria section ref (+ optional paragraph) or, via prayer_names, to every section with that leaf name in any service/nusach.';

create index if not exists idx_sc_ref on public.siddur_commentary (ref);
create index if not exists idx_sc_prayer_names on public.siddur_commentary using gin (prayer_names);
create index if not exists idx_sc_kind on public.siddur_commentary (kind);

create or replace function public.siddur_commentary_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_siddur_commentary_touch on public.siddur_commentary;
create trigger trg_siddur_commentary_touch before update on public.siddur_commentary
  for each row execute function public.siddur_commentary_touch();

alter table public.siddur_commentary enable row level security;

drop policy if exists "Public read published" on public.siddur_commentary;
create policy "Public read published" on public.siddur_commentary
  for select to anon, authenticated using (published);
