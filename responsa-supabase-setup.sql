-- Responsa received by email, rendered at /responsa/<rabbi-slug>.
-- Anyone can read published responsa; writes go through the service role
-- (Supabase MCP / dashboard). Seed: Rav Yehuda Henkin, from Gmail threads
-- 2014-2019 (henkin@012.net.il). Question and answer texts are verbatim
-- from the emails; the only cleanup is dropped markdown emphasis asterisks
-- around "chukat hagoyim" in the 2019 question, and the PS about Taaroch
-- Lefanei Shulchan book sales removed from the 2019 answer at Matthew's
-- request (18 Nov 2026).

create table if not exists public.responsa_rabbis (
  slug text primary key,
  name text not null,
  name_he text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.responsa (
  id uuid primary key default gen_random_uuid(),
  rabbi_slug text not null references public.responsa_rabbis(slug) on delete cascade,
  position int not null default 0,
  title text not null,
  title_he text,
  question_text text not null,
  question_lang text not null default 'he' check (question_lang in ('he', 'en')),
  question_date date,
  answer_text text,
  answer_lang text check (answer_lang in ('he', 'en')),
  answer_date date,
  followup_text text,
  followup_date date,
  note text,
  tags text[] not null default '{}',
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create index if not exists responsa_rabbi_idx on public.responsa (rabbi_slug, position);

alter table public.responsa_rabbis enable row level security;
alter table public.responsa enable row level security;

drop policy if exists "read responsa rabbis" on public.responsa_rabbis;
create policy "read responsa rabbis" on public.responsa_rabbis
  for select to anon, authenticated using (true);

drop policy if exists "read published responsa" on public.responsa;
create policy "read published responsa" on public.responsa
  for select to anon, authenticated using (status = 'published');

-- ---------------------------------------------------------------------------
-- Seed: Rabbi Yehuda Henkin
-- ---------------------------------------------------------------------------
insert into public.responsa_rabbis (slug, name, name_he, bio)
values ('yehuda-henkin', 'Rabbi Yehuda Henkin', 'הרב יהודה הרצל הנקין', 'Rabbi Yehuda Herzl Henkin (1945–2020), author of the four-volume Bnei Banim responsa and posek of Nishmat. Grandson of Rav Yosef Eliyahu Henkin; the answers here came by email, 2014–2019.')
on conflict (slug) do update set
  name = excluded.name, name_he = excluded.name_he, bio = excluded.bio;

delete from public.responsa where rabbi_slug = 'yehuda-henkin';

insert into public.responsa
  (rabbi_slug, position, title, title_he, question_text, question_lang, question_date,
   answer_text, answer_lang, answer_date, followup_text, followup_date, note, tags, status)
values
  ('yehuda-henkin', 1, 'Driving to minyan — is the petrol money “hefsed mammon”?', 'שאלה על תפילה בציבור והוצאת ממון בשבילה', 'בכוד הרב,ראיתי שכתוב בבאר היטב (סימן צ, ס׳׳ק י׳׳ב): "...אונס ממון שמחמת השתדלותו להתפלל עם הצבור יבא לידי הפסד ממון פסק בתשובת יד אליהו סימן ז׳ דאין מחוייב ע׳׳פ הדין ויכול להתפלל ביחיד בביתו או בבה׳׳כ כשאין שם ציבור".

שאלתי היא: האם חייבים ללכת למנין כשיש חיוב לנסוע במכונית ולשלם לגז? האם זה נקרא "הפסד ממון"?

תודה רבה,
מתתיהו מילר', 'he', '2014-11-04', 'ההפסד צריך להיות משמעותי אבל תלוי באיש ובמצבו.', 'he', '2014-11-09', NULL, NULL, 'The reply''s Date header reads 8 October 2014, but it quotes this 4 November question and reached the inbox on 9 November 2014 — dated here by arrival.', array['tefillah', 'minyan', 'hefsed-mammon']::text[], 'published'),
  ('yehuda-henkin', 2, 'May a baal teshuva choose his own minhagim?', 'שאלה על החלטת מנהגים', 'בכבוד הרב,

מה הדין לגבי בעלי תשובה למיניהם במנהגינם- האם הם יכולים להחליט מה לעשות בעצמם? אם כן, האם בעל תשובה אשכנזי יכול להנהיג כספרדי ולאכול קטניות בגלל שאין לו מנהג משפחתי?

חג כשר ושמח,

מתתיהו', 'he', '2015-03-26', NULL, NULL, NULL, NULL, NULL, NULL, array['minhag', 'baal-teshuva', 'kitniyot']::text[], 'published'),
  ('yehuda-henkin', 3, 'Answering amen when the shatz runs on without a break', 'שאלה על עניית אמן', 'בכבוד הרב,

במנין שאני מתפלל בו, הש׳׳ץ מסיים ברכת ש׳׳ע ומתחיל ברכה הבאה בלי הפסק ביניהן. מה עדיף לעשות לפי ההלכה–

1) לענות אמן לפני שהוא מסיים את הברכה הראשונה

או

2) לענות אמן אחרי שהוא מסיים את הבתכה הראשונה (אם כן, הוא מפסיד כמה מילים מהברכה השנית)

תודה רבה,

מתתיה מילר', 'he', '2016-05-23', NULL, NULL, NULL, NULL, NULL, NULL, array['tefillah', 'amen', 'shatz']::text[], 'published'),
  ('yehuda-henkin', 4, 'What is an emoji in halacha — a word, a letter, a picture?', 'שאלה על אימוג׳י', 'בכבוד הרב,

שלום וברכה. מה הדין לגבי הemoji בהלכה לגבי לכתוב אותו בשעת תפילה וכו'' (אם נגיד שכתיבה כדיבור)? יש לו דין כמלה, אות, ציור?

תודה רבה וגמר טוב,

מתתיהו', 'he', '2017-09-28', NULL, NULL, NULL, NULL, NULL, NULL, array['tefillah', 'emoji', 'writing']::text[], 'published'),
  ('yehuda-henkin', 5, 'Aharon''s silence and the sirens in Israel', NULL, 'Dear HaRav Henkin,

I seem to remember reading that the Rabbi wrote that one of the reasons why standing at attention during the sirens in Israel is permissible is due to the fact that it is not chukat hagoyim.

I thought the Rabbi brought a proof from Aharon''s silence in the face of his sons'' death (viz. since silence is a Biblical approach to tragedy, ergo there could not be an issue of chukat hagoyim).

When reviewing the topic, I could not seem to find this in the Rabbi''s writings. Did I misremeber this proof?

Best and Shabbat Shalom,

Matthew', 'en', '2019-03-29', 'Shalom, I didn''t refer to Aharon''s silence. In Bnei Banim vol. 2, siman 30, I discuss standing during the sirens.

Shavua tov,
Yehuda Henkin', 'en', '2019-03-30', 'Much appreciated for the quick response, Rabbi. Could Aharon''s silence be used as another סניף להקל?

Alas, I am not the Matthew Miller of Koren so do not know about the book sales but am sure they are selling like hot cakes.

Best,

Matthew', '2019-03-31', 'No reply to the follow-up is on file.', array['yom-hazikaron', 'sirens', 'chukat-hagoyim', 'bnei-banim']::text[], 'published');
