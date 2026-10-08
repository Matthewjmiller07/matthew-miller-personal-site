-- Source sheets built from Supabase (main project). Rendered at /sourcesheets/<slug>.
-- Anyone can read published sheets; writes go through the service role (Supabase MCP / dashboard).

create table if not exists public.source_sheets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_he text,
  subtitle text,
  intro text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_sheet_sources (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.source_sheets(id) on delete cascade,
  position int not null default 0,
  section text,              -- optional grouping heading on the sheet
  ref text not null,         -- Sefaria-style ref, e.g. "Radak on I Kings 3:12:1"
  author text,               -- display label, e.g. "Radak"
  he_text text,
  en_text text,
  note text,                 -- Matthew's gloss / why this source is here
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists source_sheet_sources_sheet_idx on public.source_sheet_sources (sheet_id, position);

alter table public.source_sheets enable row level security;
alter table public.source_sheet_sources enable row level security;

drop policy if exists "read published sheets" on public.source_sheets;
create policy "read published sheets" on public.source_sheets
  for select to anon, authenticated using (status = 'published');

drop policy if exists "read sources of published sheets" on public.source_sheet_sources;
create policy "read sources of published sheets" on public.source_sheet_sources
  for select to anon, authenticated using (
    exists (select 1 from public.source_sheets s where s.id = sheet_id and s.status = 'published')
  );

-- ---------------------------------------------------------------------------
-- Seed: On Wisdom (חָכְמָה)
-- ---------------------------------------------------------------------------
insert into public.source_sheets (slug, title, title_he, subtitle, intro, status)
values (
  'wisdom',
  'On Wisdom',
  'עַל הַחָכְמָה',
  'What does it mean to have a "wise and understanding heart"?',
  'A growing sheet on chokhmah and binah, starting with God''s gift to Solomon at Gibeon and the sages'' distinction between the one who is wise and the one who understands.',
  'published'
)
on conflict (slug) do update set
  title = excluded.title, title_he = excluded.title_he, subtitle = excluded.subtitle,
  intro = excluded.intro, status = excluded.status, updated_at = now();

with s as (select id from public.source_sheets where slug = 'wisdom')
delete from public.source_sheet_sources where sheet_id = (select id from s);

insert into public.source_sheet_sources (sheet_id, position, section, ref, author, he_text, en_text, note, tags)
select id, v.position, v.section, v.ref, v.author, v.he_text, v.en_text, v.note, v.tags
from public.source_sheets, (values
  (1, 'Solomon at Gibeon', 'I Kings 3:12', 'Melakhim I',
   'הִנֵּה עָשִׂיתִי כִּדְבָרֶיךָ הִנֵּה נָתַתִּי לְךָ לֵב חָכָם וְנָבוֹן אֲשֶׁר כָּמוֹךָ לֹא הָיָה לְפָנֶיךָ וְאַחֲרֶיךָ לֹא יָקוּם כָּמוֹךָ׃',
   'I now do as you have spoken. I grant you a wise and discerning mind; there has never been anyone like you before, nor will anyone like you arise again.',
   'Solomon asked for a "listening heart" (lev shome''a, 3:9); God answers with two words, chakham and navon.',
   array['tanakh','solomon']::text[]),
  (2, 'Solomon at Gibeon', 'Radak on I Kings 3:12:1', 'Radak',
   'לב חכם ונבון. אמרו רבותינו ז"ל חכם המקיים את למודו כלומר כי מה שלמד מקויים בלבו ומזומן נבון מבין דבר מתוך דבר.',
   'A wise and understanding heart: Our Rabbis of blessed memory said: a chakham (wise) is one who retains his learning, that is, what he has learned is preserved in his heart and ready at hand; a navon (understanding) is one who understands one thing from another.',
   'Two kinds of wisdom: keeping what you learned, and generating what you were never taught.',
   array['commentary','chakham','navon']::text[])
) as v(position, section, ref, author, he_text, en_text, note, tags)
where slug = 'wisdom';
