-- WarmHouse (/warmhouse): order and sample requests. Already applied to the main Supabase project.
-- The public can insert requests and add photos, never read them; the notify workflow reads through
-- token-gated RPCs (scripts/warmhouse/notify_requests.py).
create table public.warmhouse_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  brokerage text,
  kind text,
  tier text,
  quantity text,
  property_address text,
  plate_text text,
  closing_date date,
  listing_url text,
  note text,
  agent_slug text,
  model_choice text,
  photo_paths text[] not null default '{}',
  notified_at timestamptz
);
alter table public.warmhouse_requests enable row level security;
create policy "anyone can send a warmhouse request" on public.warmhouse_requests
  for insert to anon, authenticated with check (notified_at is null);

create function public.warmhouse_requests_pending(p_token text)
 returns setof public.warmhouse_requests language plpgsql security definer set search_path to '' as $$
begin
  if not private.newsletter_token_ok(p_token) then raise exception 'forbidden'; end if;
  return query select * from public.warmhouse_requests where notified_at is null order by created_at limit 50;
end $$;

create function public.warmhouse_requests_mark(p_token text, p_ids uuid[])
 returns void language plpgsql security definer set search_path to '' as $$
begin
  if not private.newsletter_token_ok(p_token) then raise exception 'forbidden'; end if;
  update public.warmhouse_requests set notified_at = now() where id = any(p_ids);
end $$;

-- Private bucket for the listing photos sent with a request.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('warmhouse-photos', 'warmhouse-photos', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;
create policy "anyone can add warmhouse photos" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'warmhouse-photos');
