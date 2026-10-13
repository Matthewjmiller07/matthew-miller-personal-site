// One-line glosses for Balashon posts: what the word means and where Balashon says it comes from,
// for the "More from Balashon" shelf of the Shabbat reader. Reads the queue fetch.mjs wrote
// (src/data/balashon/gloss-queue.json), asks Claude Code (CLAUDE_CODE_OAUTH_TOKEN) in batches, saves
// each gloss to glosses.json by post URL, fills them into posts.json and shrinks the queue.
// With no token it does nothing, and the queue waits for the next run or a Claude session.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const GLOSSES = new URL('../../src/data/balashon/glosses.json', import.meta.url);
const POSTS = new URL('../../src/data/balashon/posts.json', import.meta.url);
const QUEUE = new URL('../../src/data/balashon/gloss-queue.json', import.meta.url);
if (!existsSync(QUEUE)) { console.log('no posts waiting for a gloss'); process.exit(0); }
const queue = JSON.parse(readFileSync(QUEUE, 'utf8'));
const glosses = existsSync(GLOSSES) ? JSON.parse(readFileSync(GLOSSES, 'utf8')) : {};
const BATCH = 15;

const PROMPT = `You are writing one-line glosses for a printed Shabbat-table reader that lists posts from
Balashon, David Curwin's blog on Hebrew etymology. For each post below, write ONE line of at most
20 words saying what the Hebrew word means and the key point of its origin or connection, as the
post itself argues it. Use only what the post says; do not add etymologies of your own. Plain
English, no Hebrew script, no quotation marks around the whole line, start with the meaning
(e.g. "corn; once meant any grain, like the Bible's dagan, before maize took the name").

Answer with ONLY a JSON array of {"url": ..., "gloss": ...} objects, one per post, nothing else.

POSTS:
`;

if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) console.log(`no CLAUDE_CODE_OAUTH_TOKEN; ${queue.length} posts stay queued`);
for (let i = 0; process.env.CLAUDE_CODE_OAUTH_TOKEN && i < queue.length; i += BATCH) {
  const batch = queue.slice(i, i + BATCH);
  const input = batch.map((p) => `--- url: ${p.url}\ntitle: ${p.title}${p.he ? ` (${p.he})` : ''}\n${p.text}`).join('\n\n');
  let out;
  try {
    out = execFileSync('claude', ['-p', '--output-format', 'text'], { input: PROMPT + input, encoding: 'utf8', maxBuffer: 1 << 24, timeout: 300_000 });
  } catch (err) {
    console.error(`batch ${i / BATCH + 1}: claude failed (exit ${err.status}): ${String(err.stdout ?? '').slice(0, 800)} ${String(err.stderr ?? '').slice(0, 800)}`);
    if (i === 0) process.exit(1); // the first batch failing means auth or setup, not the content
    continue;
  }
  const json = out.slice(out.indexOf('['), out.lastIndexOf(']') + 1);
  let rows = [];
  try { rows = JSON.parse(json); } catch { console.error(`batch ${i / BATCH + 1}: unparseable output:\n${out.slice(0, 500)}`); continue; }
  const urls = new Set(batch.map((p) => p.url));
  for (const r of rows) {
    if (urls.has(r.url) && typeof r.gloss === 'string' && r.gloss.trim()) glosses[r.url] = r.gloss.trim().replace(/^["“]|["”]$/g, '');
  }
  console.log(`batch ${i / BATCH + 1}: ${rows.length}/${batch.length} glosses`);
  writeFileSync(GLOSSES, `${JSON.stringify(glosses, null, 1)}\n`);
}

const left = queue.filter((p) => !glosses[p.url]);
if (left.length) writeFileSync(QUEUE, `${JSON.stringify(left, null, 1)}\n`);
else unlinkSync(QUEUE);

const posts = JSON.parse(readFileSync(POSTS, 'utf8'));
for (const week of Object.values(posts.parshiot)) {
  for (const p of week.posts) p.gloss = glosses[p.url] ?? p.gloss ?? null;
}
writeFileSync(POSTS, `${JSON.stringify(posts, null, 1)}\n`);
console.log(`${Object.keys(glosses).length} glosses in all`);
