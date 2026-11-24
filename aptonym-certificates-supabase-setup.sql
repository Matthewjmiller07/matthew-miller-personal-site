-- Aptonym certificates: people claim a "Certified Aptonym" credential for their own name, Matthew
-- reviews each claim, and an issued certificate lives at /aptonyms/certificate/<code>, where the
-- holder can add it to their LinkedIn profile (Licenses & certifications) with a link back here.
--
-- The table is closed to the anon key. Everything goes through security-definer functions:
--   aptonym_claim_submit          anon      the form on /aptonyms/certificate
--   aptonym_certificate_get       anon      a certificate page (issued, or pending with the claim token)
--   aptonym_certificates_issued   anon      "Certified" badges on /aptonyms
--   aptonym_claim_for_review      anon+key  the review page, with the per-claim review key from Matthew's email
--   aptonym_claim_decide          anon+key  issue / decline (issuing also adds the name to "Serendipitous Names")
--   aptonym_claims_pending / _mark, aptonym_decisions_pending / _mark
--                                 NEWSLETTER_TOKEN  scripts/aptonyms/notify_certificates.py (emails)

create table if not exists public.aptonym_certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  aptonym_part text not null check (aptonym_part in ('First', 'Last', 'Both')),
  profession text not null,
  how_it_fits text not null,
  proof_url text,
  linkedin_url text,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'issued', 'declined')),
  claim_token text not null,
  review_token text not null,
  aptonym_name text,
  note_from_registrar text,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  decided_at timestamptz,
  issued_at timestamptz,
  decision_notified_at timestamptz
);
alter table public.aptonym_certificates enable row level security;
revoke all on public.aptonym_certificates from anon, authenticated;

create or replace function private.aptonym_code() returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  out text := '';
begin
  for i in 0..5 loop
    out := out || substr(alphabet, 1 + (get_byte(bytes, i) % length(alphabet)), 1);
  end loop;
  return 'APT-' || to_char(now(), 'YYYY') || '-' || out;
end $$;

create or replace function public.aptonym_claim_submit(
  p_name text, p_part text, p_profession text, p_fits text,
  p_proof text, p_linkedin text, p_email text
) returns table (code text, claim_token text)
language plpgsql security definer set search_path to '' as $$
declare
  v_code text;
  v_claim text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  p_name := left(btrim(coalesce(p_name, '')), 120);
  p_profession := left(btrim(coalesce(p_profession, '')), 200);
  p_fits := left(btrim(coalesce(p_fits, '')), 1000);
  p_email := lower(left(btrim(coalesce(p_email, '')), 200));
  if p_name = '' or p_profession = '' or p_fits = '' then raise exception 'missing fields'; end if;
  if p_part not in ('First', 'Last', 'Both') then raise exception 'bad part'; end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'bad email'; end if;
  if (select count(*) from public.aptonym_certificates c where c.email = p_email and c.status = 'pending') >= 3
     or (select count(*) from public.aptonym_certificates c where c.status = 'pending') >= 300 then
    raise exception 'too many pending claims';
  end if;
  loop
    v_code := private.aptonym_code();
    exit when not exists (select 1 from public.aptonym_certificates c where c.code = v_code);
  end loop;
  insert into public.aptonym_certificates
    (code, name, aptonym_part, profession, how_it_fits, proof_url, linkedin_url, email, claim_token, review_token)
  values
    (v_code, p_name, p_part, p_profession, p_fits,
     nullif(left(btrim(coalesce(p_proof, '')), 500), ''), nullif(left(btrim(coalesce(p_linkedin, '')), 500), ''),
     p_email, v_claim, encode(extensions.gen_random_bytes(16), 'hex'));
  return query select v_code, v_claim;
end $$;

create or replace function public.aptonym_certificate_get(p_code text, p_claim text default null)
returns table (
  code text, name text, aptonym_part text, profession text, how_it_fits text, proof_url text,
  linkedin_url text, status text, issued_at timestamptz, created_at timestamptz, aptonym_name text,
  note_from_registrar text
) language sql stable security definer set search_path to '' as $$
  select c.code, c.name, c.aptonym_part, c.profession, c.how_it_fits, c.proof_url, c.linkedin_url,
         c.status, c.issued_at, c.created_at, c.aptonym_name,
         case when c.claim_token = p_claim then c.note_from_registrar end
  from public.aptonym_certificates c
  where c.code = upper(p_code) and (c.status = 'issued' or (p_claim is not null and c.claim_token = p_claim));
$$;

create or replace function public.aptonym_certificates_issued()
returns table (code text, name text, aptonym_name text, issued_at timestamptz)
language sql stable security definer set search_path to '' as $$
  select c.code, c.name, c.aptonym_name, c.issued_at
  from public.aptonym_certificates c where c.status = 'issued' order by c.issued_at desc;
$$;

create or replace function public.aptonym_claim_for_review(p_code text, p_key text)
returns setof public.aptonym_certificates
language sql stable security definer set search_path to '' as $$
  select * from public.aptonym_certificates c where c.code = upper(p_code) and c.review_token = p_key;
$$;

create or replace function public.aptonym_claim_decide(
  p_code text, p_key text, p_decision text,
  p_part text default null, p_profession text default null, p_fits text default null, p_note text default null
) returns text
language plpgsql security definer set search_path to '' as $$
declare
  c public.aptonym_certificates;
begin
  select * into c from public.aptonym_certificates x where x.code = upper(p_code) and x.review_token = p_key for update;
  if not found then raise exception 'forbidden'; end if;
  if p_decision not in ('issue', 'decline') then raise exception 'bad decision'; end if;
  if c.status <> 'pending' then return c.status; end if;

  if p_decision = 'decline' then
    update public.aptonym_certificates set status = 'declined', decided_at = now(),
      note_from_registrar = nullif(left(btrim(coalesce(p_note, '')), 1000), '')
    where id = c.id;
    return 'declined';
  end if;

  update public.aptonym_certificates set
    status = 'issued', decided_at = now(), issued_at = now(),
    aptonym_part = case when p_part in ('First', 'Last', 'Both') then p_part else aptonym_part end,
    profession = coalesce(nullif(left(btrim(p_profession), 200), ''), profession),
    how_it_fits = coalesce(nullif(left(btrim(p_fits), 1000), ''), how_it_fits),
    note_from_registrar = nullif(left(btrim(coalesce(p_note, '')), 1000), ''),
    aptonym_name = name
  where id = c.id
  returning * into c;

  -- Enter the holder in the public registry (/aptonyms) unless they are already there.
  if not exists (select 1 from public."Serendipitous Names" s where lower(s."Name") = lower(c.name)) then
    insert into public."Serendipitous Names" ("Name", "Aptonym Part", "Profession / Role", "How the Name Fits the Role", "Link", "#", created_at)
    values (c.name, c.aptonym_part, c.profession, c.how_it_fits,
            coalesce(c.proof_url, 'https://theothermatthewmiller.com/aptonyms/certificate/' || c.code),
            (select coalesce(max(s."#"), 0) + 1 from public."Serendipitous Names" s), now());
  else
    update public.aptonym_certificates set aptonym_name =
      (select s."Name" from public."Serendipitous Names" s where lower(s."Name") = lower(c.name) limit 1)
    where id = c.id;
  end if;
  return 'issued';
end $$;

create or replace function public.aptonym_claims_pending(p_token text)
returns table (code text, name text, aptonym_part text, profession text, how_it_fits text, proof_url text,
               linkedin_url text, email text, review_token text, created_at timestamptz)
language plpgsql security definer set search_path to '' as $$
begin
  if not private.newsletter_token_ok(p_token) then raise exception 'forbidden'; end if;
  return query select c.code, c.name, c.aptonym_part, c.profession, c.how_it_fits, c.proof_url, c.linkedin_url,
                      c.email, c.review_token, c.created_at
    from public.aptonym_certificates c where c.notified_at is null order by c.created_at limit 50;
end $$;

create or replace function public.aptonym_claims_mark(p_token text, p_codes text[])
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not private.newsletter_token_ok(p_token) then raise exception 'forbidden'; end if;
  update public.aptonym_certificates set notified_at = now() where code = any(p_codes);
end $$;

create or replace function public.aptonym_decisions_pending(p_token text)
returns table (code text, name text, email text, status text, claim_token text, note_from_registrar text)
language plpgsql security definer set search_path to '' as $$
begin
  if not private.newsletter_token_ok(p_token) then raise exception 'forbidden'; end if;
  return query select c.code, c.name, c.email, c.status, c.claim_token, c.note_from_registrar
    from public.aptonym_certificates c
    where c.status in ('issued', 'declined') and c.decision_notified_at is null order by c.decided_at limit 50;
end $$;

create or replace function public.aptonym_decisions_mark(p_token text, p_codes text[])
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not private.newsletter_token_ok(p_token) then raise exception 'forbidden'; end if;
  update public.aptonym_certificates set decision_notified_at = now() where code = any(p_codes);
end $$;

revoke execute on function private.aptonym_code() from public, anon, authenticated;
grant execute on function public.aptonym_claim_submit(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.aptonym_certificate_get(text, text) to anon, authenticated;
grant execute on function public.aptonym_certificates_issued() to anon, authenticated;
grant execute on function public.aptonym_claim_for_review(text, text) to anon, authenticated;
grant execute on function public.aptonym_claim_decide(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.aptonym_claims_pending(text) to anon;
grant execute on function public.aptonym_claims_mark(text, text[]) to anon;
grant execute on function public.aptonym_decisions_pending(text) to anon;
grant execute on function public.aptonym_decisions_mark(text, text[]) to anon;

-- ── Invites: a personal link for someone already in the registry ─────────────────────────────────
-- Matthew vetted every "Serendipitous Names" entry when he added it, so their certificate needs no
-- review: /aptonyms/certificate/invite/<token> issues it on the spot (once; after that the link opens
-- the certificate). Links are listed on /aptonyms/certificate/invites?k=<admin key>; the key's
-- SHA-256 lives in private.aptonym_admin (set it with: insert into private.aptonym_admin values
-- (encode(extensions.digest('<key>', 'sha256'), 'hex')) ).

alter table public.aptonym_certificates alter column email drop not null;

create table if not exists private.aptonym_admin (key_hash text primary key);

create table if not exists public.aptonym_invites (
  token text primary key default encode(extensions.gen_random_bytes(12), 'hex'),
  aptonym_name text not null unique,
  code text,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);
alter table public.aptonym_invites enable row level security;
revoke all on public.aptonym_invites from anon, authenticated;

create or replace function private.aptonym_admin_ok(p_key text) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from private.aptonym_admin a
                 where a.key_hash = encode(extensions.digest(coalesce(p_key, ''), 'sha256'), 'hex'));
$$;

-- Every registry entry with its invite link (minted on first sight) and certificate, if any.
create or replace function public.aptonym_invites_list(p_key text)
returns table (aptonym_name text, profession text, token text, code text, redeemed_at timestamptz, added_at timestamptz)
language plpgsql security definer set search_path to '' as $$
begin
  if not private.aptonym_admin_ok(p_key) then raise exception 'forbidden'; end if;
  -- Named constraint, not (aptonym_name): that would clash with the output column of the same name.
  insert into public.aptonym_invites as inv (aptonym_name)
    select s."Name" from public."Serendipitous Names" s where s."Name" is not null
    on conflict on constraint aptonym_invites_aptonym_name_key do nothing;
  return query
    select s."Name", s."Profession / Role", i.token,
           coalesce(i.code, (select c.code from public.aptonym_certificates c where c.aptonym_name = s."Name" and c.status = 'issued' limit 1)),
           i.redeemed_at, s.created_at
    from public."Serendipitous Names" s join public.aptonym_invites i on i.aptonym_name = s."Name"
    order by s.created_at desc nulls last, s."Name";
end $$;

create or replace function public.aptonym_invite_get(p_token text)
returns table (aptonym_name text, aptonym_part text, profession text, how_it_fits text, link text, code text)
language sql stable security definer set search_path to '' as $$
  select s."Name", s."Aptonym Part", s."Profession / Role", s."How the Name Fits the Role", s."Link", i.code
  from public.aptonym_invites i join public."Serendipitous Names" s on s."Name" = i.aptonym_name
  where i.token = p_token;
$$;

create or replace function public.aptonym_invite_redeem(p_token text, p_email text, p_linkedin text)
returns table (code text, claim_token text)
language plpgsql security definer set search_path to '' as $$
declare
  i public.aptonym_invites;
  s record;
  v_code text;
  v_claim text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  select * into i from public.aptonym_invites x where x.token = p_token for update;
  if not found then raise exception 'forbidden'; end if;
  if i.code is not null then
    return query select c.code, c.claim_token from public.aptonym_certificates c where c.code = i.code;
    return;
  end if;
  select * into s from public."Serendipitous Names" n where n."Name" = i.aptonym_name;
  p_email := nullif(lower(left(btrim(coalesce(p_email, '')), 200)), '');
  if p_email is not null and p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'bad email'; end if;
  loop
    v_code := private.aptonym_code();
    exit when not exists (select 1 from public.aptonym_certificates c where c.code = v_code);
  end loop;
  insert into public.aptonym_certificates
    (code, name, aptonym_part, profession, how_it_fits, proof_url, linkedin_url, email, status,
     claim_token, review_token, aptonym_name, decided_at, issued_at)
  values
    (v_code, s."Name",
     case when s."Aptonym Part" in ('First', 'Last', 'Both') then s."Aptonym Part" else 'Last' end,
     coalesce(nullif(s."Profession / Role", ''), 'Aptonym'), coalesce(nullif(s."How the Name Fits the Role", ''), 'Their name fits.'),
     case when s."Link" ~* '^https?://' then left(s."Link", 500) end,
     nullif(left(btrim(coalesce(p_linkedin, '')), 500), ''), p_email, 'issued',
     v_claim, encode(extensions.gen_random_bytes(16), 'hex'), s."Name", now(), now());
  update public.aptonym_invites set code = v_code, redeemed_at = now() where token = p_token;
  return query select v_code, v_claim;
end $$;

-- Decision emails only go to holders who left an address.
create or replace function public.aptonym_decisions_pending(p_token text)
returns table (code text, name text, email text, status text, claim_token text, note_from_registrar text)
language plpgsql security definer set search_path to '' as $$
begin
  if not private.newsletter_token_ok(p_token) then raise exception 'forbidden'; end if;
  return query select c.code, c.name, c.email, c.status, c.claim_token, c.note_from_registrar
    from public.aptonym_certificates c
    where c.status in ('issued', 'declined') and c.decision_notified_at is null and c.email is not null order by c.decided_at limit 50;
end $$;

-- The claims email to Matthew also says when an invite was redeemed (status already 'issued').
drop function if exists public.aptonym_claims_pending(text);
create function public.aptonym_claims_pending(p_token text)
returns table (code text, name text, aptonym_part text, profession text, how_it_fits text, proof_url text,
               linkedin_url text, email text, review_token text, created_at timestamptz, status text)
language plpgsql security definer set search_path to '' as $$
begin
  if not private.newsletter_token_ok(p_token) then raise exception 'forbidden'; end if;
  return query select c.code, c.name, c.aptonym_part, c.profession, c.how_it_fits, c.proof_url, c.linkedin_url,
                      c.email, c.review_token, c.created_at, c.status
    from public.aptonym_certificates c where c.notified_at is null order by c.created_at limit 50;
end $$;

revoke execute on function private.aptonym_admin_ok(text) from public, anon, authenticated;
grant execute on function public.aptonym_invites_list(text) to anon, authenticated;
grant execute on function public.aptonym_invite_get(text) to anon, authenticated;
grant execute on function public.aptonym_invite_redeem(text, text, text) to anon, authenticated;
grant execute on function public.aptonym_claims_pending(text) to anon;
