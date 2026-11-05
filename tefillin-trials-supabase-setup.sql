-- Leaderboard for Hineni: The Tefillin Trials (/tefillin-trials), main Supabase project.
-- One row per finished level run. Anyone can read; writes go through /api/tefillin-trials,
-- which validates the run and inserts with the service role.

create table if not exists public.tefillin_trials_scores (
  id bigint generated always as identity primary key,
  player text not null check (char_length(player) between 1 and 24),
  level text not null check (level in ('gauntlet', 'catch', 'table', 'stand')),
  score integer not null check (score between 0 and 5000),
  stars smallint not null default 0 check (stars between 0 and 3),
  minhag text check (minhag in ('ashkenaz', 'sefard')),
  created_at timestamptz not null default now()
);

create index if not exists tefillin_trials_scores_level_score
  on public.tefillin_trials_scores (level, score desc, created_at);

alter table public.tefillin_trials_scores enable row level security;

drop policy if exists "tefillin trials scores are public" on public.tefillin_trials_scores;
create policy "tefillin trials scores are public"
  on public.tefillin_trials_scores for select to anon, authenticated using (true);
