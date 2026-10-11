-- Card bank for /lost-in-translation (main project). Live cards are generated with Hugging Face
-- once, saved here, and replayed, so most plays cost nothing. Anyone can read visible cards;
-- writes go through /api/lost-in-translation with the service role.

create table if not exists public.lit_cards (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('tanakh', 'avot', 'menu')),
  he text not null,
  bad text not null,
  card jsonb not null,           -- the card as served to the page
  plays int not null default 0,
  wins int not null default 0,
  skips int not null default 0,  -- "Bad card, skip" presses
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (mode, he, bad)
);

create index if not exists lit_cards_mode_idx on public.lit_cards (mode) where not hidden;
create index if not exists lit_cards_created_idx on public.lit_cards (created_at);

alter table public.lit_cards enable row level security;

drop policy if exists "lit_cards visible to all" on public.lit_cards;
create policy "lit_cards visible to all" on public.lit_cards for select using (not hidden);

-- Record one play. A card skipped three times, and more often than it was solved, is hidden.
create or replace function public.lit_card_result(card_id uuid, outcome text)
returns void
language sql
security definer
set search_path = public
as $$
  update lit_cards set
    plays = plays + case when outcome in ('win', 'loss') then 1 else 0 end,
    wins = wins + case when outcome = 'win' then 1 else 0 end,
    skips = skips + case when outcome = 'skip' then 1 else 0 end,
    hidden = hidden or (outcome = 'skip' and skips + 1 >= 3 and skips + 1 > wins)
  where id = card_id;
$$;

revoke all on function public.lit_card_result(uuid, text) from public, anon, authenticated;
grant execute on function public.lit_card_result(uuid, text) to service_role;
