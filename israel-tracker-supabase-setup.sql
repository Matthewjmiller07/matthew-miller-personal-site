-- Israel life tracker (/israel) — Supabase schema.
--
-- Already applied to the live project as the migrations `israel_life_tracker` and
-- `israel_touch_updated_at_invoker`. Kept here so the schema is readable in the repo
-- and re-creatable from scratch; it is safe to re-run.
--
-- What is NOT in here: the geography. The 1,271 CBS settlements and the district /
-- sub-district polygons are open government data, versioned as
-- public/data/israel-places.json and public/data/israel-regions.geojson and rebuilt by
-- scripts/build-israel-places.mjs. Log rows point at a settlement through place_code
-- (the "semel yishuv"), so the two join without duplicating a public dataset into
-- Postgres.
--
-- Attendance lives in a text[] of israel_people.slug values rather than a join table:
-- every read wants the whole set anyway, and it keeps a save to a single statement.

create extension if not exists "pgcrypto";

-- Who was there ------------------------------------------------------------------
create table if not exists public.israel_people (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  name_he     text,
  color       text,
  in_family   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

comment on table public.israel_people is
  'Family members and regular companions. slug is the stable key used in attendees[].';

-- Where we daven -----------------------------------------------------------------
create table if not exists public.israel_shuls (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name_he            text not null,
  name_en            text,
  address_he         text,
  city               text not null default 'רעננה',
  place_code         text,
  lat                double precision,
  lng                double precision,
  early_mincha_arvit boolean,
  nusach             text,
  notes              text,
  source             text,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column public.israel_shuls.early_mincha_arvit is
  'Has mincha ketana close to shkia + arvit at tzeit (the "יש/אין" column of the Ra''anana list). Null = not stated.';
comment on column public.israel_shuls.place_code is
  'CBS semel yishuv of the town the shul is in; joins to public/data/israel-places.json.';

-- One row per minyan attended ----------------------------------------------------
create table if not exists public.israel_minyanim (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  tefillah    text not null
                check (tefillah in ('shacharit', 'mincha', 'arvit', 'mincha_arvit',
                                    'musaf', 'selichot', 'other')),
  shul_id     uuid references public.israel_shuls (id) on delete set null,
  shul_name   text,
  place_code  text,
  minyan_time time,
  attendees   text[] not null default '{}',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint israel_minyanim_has_location check (shul_id is not null or shul_name is not null)
);

comment on column public.israel_minyanim.shul_name is
  'Free text for a minyan away from home that is not in israel_shuls.';

-- One row per Shabbat, plus a row per meal ---------------------------------------
create table if not exists public.israel_shabbatot (
  id           uuid primary key default gen_random_uuid(),
  shabbat_date date not null unique,
  parasha      text,
  place_code   text,
  place_name   text,
  host         text,
  away         boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.israel_shabbatot.shabbat_date is
  'The Saturday itself, so Friday night and Shabbat day sort together.';
comment on column public.israel_shabbatot.away is
  'True when we slept away from home rather than just eating out.';

create table if not exists public.israel_shabbat_meals (
  id         uuid primary key default gen_random_uuid(),
  shabbat_id uuid not null references public.israel_shabbatot (id) on delete cascade,
  meal       text not null
               check (meal in ('friday_night', 'shabbat_lunch', 'seudah_shlishit',
                               'kiddush', 'dessert', 'melave_malka')),
  place_code text,
  host       text,
  location   text,
  attendees  text[] not null default '{}',
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.israel_shabbat_meals is
  'The three meals plus kiddush / dessert / melave malka — each can be somewhere else, with a different set of us there.';

-- Anywhere else we went ----------------------------------------------------------
create table if not exists public.israel_visits (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  place_code text,
  place_name text,
  title      text,
  category   text,
  attendees  text[] not null default '{}',
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint israel_visits_has_place check (place_code is not null or place_name is not null)
);

comment on table public.israel_visits is
  'Weekday trips — anywhere in the country worth remembering we went to.';

create index if not exists israel_minyanim_date_idx on public.israel_minyanim (date desc);
create index if not exists israel_minyanim_shul_idx on public.israel_minyanim (shul_id);
create index if not exists israel_shabbatot_date_idx on public.israel_shabbatot (shabbat_date desc);
create index if not exists israel_shabbat_meals_shabbat_idx on public.israel_shabbat_meals (shabbat_id);
create index if not exists israel_visits_date_idx on public.israel_visits (date desc);

-- Keep updated_at honest ---------------------------------------------------------
create or replace function public.israel_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.israel_touch_updated_at() from anon, authenticated, public;

do $$
declare
  t text;
begin
  foreach t in array array['israel_shuls', 'israel_minyanim', 'israel_shabbatot',
                           'israel_shabbat_meals', 'israel_visits']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.israel_touch_updated_at()',
      t || '_touch', t);
  end loop;
end;
$$;

-- RLS: the page is public, so anyone may read. There is deliberately no write policy
-- for anon — writes go through /api/israel, which holds the service-role key behind a
-- passcode check.
alter table public.israel_people        enable row level security;
alter table public.israel_shuls         enable row level security;
alter table public.israel_minyanim      enable row level security;
alter table public.israel_shabbatot     enable row level security;
alter table public.israel_shabbat_meals enable row level security;
alter table public.israel_visits        enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['israel_people', 'israel_shuls', 'israel_minyanim',
                           'israel_shabbatot', 'israel_shabbat_meals', 'israel_visits']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_public_read', t);
  end loop;
end;
$$;
