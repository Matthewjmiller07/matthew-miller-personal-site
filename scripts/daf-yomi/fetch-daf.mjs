#!/usr/bin/env node
/**
 * Daf Yomi harness — fetches everything needed to build a daily daf game.
 *
 * Usage:
 *   node scripts/daf-yomi/fetch-daf.mjs             # today's daf (Sefaria calendar)
 *   node scripts/daf-yomi/fetch-daf.mjs "Chullin 71" # a specific daf
 *
 * Writes src/data/daf-yomi/<slug>.json with:
 *   - ref, heRef, slug, date
 *   - segments: [{ ref, he, en }] for both amudim (a + b)
 *   - links: commentary/connection summary grouped by work, with per-segment anchors
 *   - topics: Sefaria topics linked to this daf
 */

import fs from 'node:fs';
import path from 'node:path';

const API = 'https://www.sefaria.org/api';
const OUT_DIR = path.join(process.cwd(), 'src', 'data', 'daf-yomi');

async function getJSON(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

async function todaysDaf() {
  const cal = await getJSON(`${API}/calendars`);
  const item = cal.calendar_items.find((i) => i.title.en === 'Daf Yomi');
  if (!item) throw new Error('No Daf Yomi entry in Sefaria calendar');
  return item.ref; // e.g. "Chullin 71"
}

function stripHtml(s) {
  return (s || '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchAmud(ref) {
  const data = await getJSON(
    `${API}/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0`
  );
  const he = Array.isArray(data.he) ? data.he : [data.he];
  const en = Array.isArray(data.text) ? data.text : [data.text];
  const n = Math.max(he.length, en.length);
  const segments = [];
  for (let i = 0; i < n; i++) {
    segments.push({
      ref: `${data.sectionRef}:${i + 1}`,
      he: stripHtml(he[i]),
      en: stripHtml(en[i]),
      enHtml: en[i] || '', // keep Sefaria's bold/italic markup (bold = literal translation)
    });
  }
  return { heRef: data.heRef, segments };
}

async function fetchLinks(ref) {
  const links = await getJSON(`${API}/links/${encodeURIComponent(ref)}?with_text=0`);
  const byWork = {};
  for (const l of links) {
    const work = l.collectiveTitle?.en || l.index_title || 'Unknown';
    if (!byWork[work]) {
      byWork[work] = { work, heWork: l.collectiveTitle?.he || '', category: l.category, count: 0, refs: [] };
    }
    byWork[work].count++;
    if (byWork[work].refs.length < 40) {
      byWork[work].refs.push({ ref: l.ref, anchor: l.anchorRef });
    }
  }
  return Object.values(byWork).sort((a, b) => b.count - a.count);
}

async function fetchTopics(ref) {
  try {
    const data = await getJSON(`${API}/ref-topic-links/${encodeURIComponent(ref)}`);
    const seen = new Set();
    return data
      .filter((t) => t.topic && !seen.has(t.topic) && seen.add(t.topic))
      .slice(0, 30)
      .map((t) => ({ slug: t.topic, title: t.title?.en || t.topic }));
  } catch {
    return [];
  }
}

async function main() {
  const ref = process.argv[2] || (await todaysDaf());
  const slug = ref.toLowerCase().replace(/\s+/g, '-');
  console.log(`Fetching daf bundle for: ${ref} (slug: ${slug})`);

  const [amudA, amudB, links, topics] = await Promise.all([
    fetchAmud(`${ref}a`),
    fetchAmud(`${ref}b`).catch(() => null), // last daf of a tractate may lack an amud b
    fetchLinks(ref),
    fetchTopics(ref),
  ]);

  const bundle = {
    ref,
    heRef: amudA.heRef.replace(/ ע"א$/, ''),
    slug,
    date: new Date().toISOString().slice(0, 10),
    amudA: amudA.segments,
    amudB: amudB ? amudB.segments : [],
    links,
    topics,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2));

  console.log(`Wrote ${outPath}`);
  console.log(`  amud a: ${bundle.amudA.length} segments, amud b: ${bundle.amudB.length} segments`);
  console.log(`  linked works: ${links.length} (top: ${links.slice(0, 5).map((l) => `${l.work} ×${l.count}`).join(', ')})`);
  console.log(`  topics: ${topics.map((t) => t.title).join(', ') || 'none'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
