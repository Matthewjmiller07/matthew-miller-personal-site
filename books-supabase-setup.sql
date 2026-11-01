-- The bookshelf at /books (main Supabase project).
-- One row per book: the ones on the shelf, the ones given away that live on as a digital copy
-- (archive.org, HebrewBooks.org or a PDF), and the ones simply gone.
-- Anyone can read; writes go through /api/books (BOOKS_PASSWORD, falling back to DESK_PASSWORD)
-- with the service role, or the Supabase MCP / dashboard.

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_he text,
  author text,
  year text,                 -- free text: "1740", "c. 1890", "תרפ״ה"
  language text,
  isbn text,
  status text not null default 'shelf'
    check (status in ('shelf', 'digital', 'gone')),
    -- shelf   = the physical copy is still here
    -- digital = the physical copy is gone; a digital copy stands in for it
    -- gone    = given away, no digital copy (yet)
  digital_source text check (digital_source in ('archive', 'hebrewbooks', 'pdf', 'other')),
  digital_id text,           -- archive.org identifier or HebrewBooks req number
  digital_url text,          -- the page to open (archive.org/details/..., hebrewbooks.org/...)
  pdf_url text,              -- direct PDF download when there is one
  cover_url text,
  notes text,
  tags text[] not null default '{}',
  parted_on date,            -- when the physical copy left the house
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_status_idx on public.books (status);
-- Pasting the same archive.org / HebrewBooks link again updates that book instead of adding a twin.
create unique index if not exists books_digital_uidx on public.books (digital_source, digital_id)
  where digital_id is not null;

alter table public.books enable row level security;

drop policy if exists "books are public" on public.books;
create policy "books are public" on public.books for select to anon, authenticated using (true);

create or replace function public.books_touch() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists books_touch on public.books;
create trigger books_touch before update on public.books
  for each row execute function public.books_touch();
