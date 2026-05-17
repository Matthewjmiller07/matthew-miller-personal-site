#!/usr/bin/env node
/**
 * Extracts hyperlinks from SCP notes PDFs, enriches them with metadata
 * (title, description, resolved URL, type), and stores them in scp.json.
 *
 * For each link it:
 *   1. Follows redirects to find the final URL
 *   2. Fetches the page and parses og:title / og:description / <title>
 *   3. Detects YouTube URLs and marks them for embedding
 *   4. Detects Sefaria URLs and labels them accordingly
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseHtml } from 'node-html-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCP_DATA = path.join(ROOT, 'src/data/scp.json');
const PUBLIC_DIR = path.join(ROOT, 'public/scp');

const USER_AGENT = 'Mozilla/5.0 (compatible; SCPLinkBot/1.0)';
const FETCH_TIMEOUT = 10_000;

// ── PDF parsing ──────────────────────────────────────────────────────────────

function extractUrisFromPdf(buffer) {
  const str = buffer.toString('latin1');
  const urls = new Set();

  const pattern = /\/URI\s*\(([^)]+)\)/g;
  let m;
  while ((m = pattern.exec(str)) !== null) {
    const url = m[1].trim();
    if (/^https?:\/\//.test(url)) urls.add(url);
  }

  return [...urls];
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function youtubeVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch {}
  return null;
}

function detectType(resolvedUrl) {
  if (youtubeVideoId(resolvedUrl)) return 'youtube';
  try {
    const { hostname } = new URL(resolvedUrl);
    if (hostname.includes('sefaria.org')) return 'sefaria';
    if (hostname.includes('hebrewbooks.org')) return 'hebrewbooks';
  } catch {}
  return 'link';
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveUrl(rawUrl) {
  try {
    const res = await fetchWithTimeout(rawUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
    });
    return res.url || rawUrl;
  } catch {
    return rawUrl;
  }
}

async function fetchMeta(resolvedUrl) {
  try {
    const res = await fetchWithTimeout(resolvedUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    });
    if (!res.ok) return {};
    const html = await res.text();
    const root = parseHtml(html);

    const og = (prop) =>
      root.querySelector(`meta[property="og:${prop}"]`)?.getAttribute('content')?.trim() ||
      root.querySelector(`meta[name="og:${prop}"]`)?.getAttribute('content')?.trim() ||
      '';

    const title =
      og('title') ||
      root.querySelector('title')?.text?.trim() ||
      '';

    const description =
      og('description') ||
      root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
      '';

    return { title, description };
  } catch {
    return {};
  }
}

async function youtubeOembed(videoId) {
  try {
    const url = `https://www.youtube.com/oembed?url=https://youtu.be/${videoId}&format=json`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return {};
    const json = await res.json();
    return {
      title: json.title || '',
      description: '',
      thumbnail: json.thumbnail_url || '',
      authorName: json.author_name || '',
    };
  } catch {
    return {};
  }
}

// ── Enrichment ────────────────────────────────────────────────────────────────

async function enrichLink(rawUrl) {
  console.log(`  → resolving ${rawUrl}`);
  const resolvedUrl = await resolveUrl(rawUrl);
  if (resolvedUrl !== rawUrl) console.log(`    resolved → ${resolvedUrl}`);

  const type = detectType(resolvedUrl);
  let meta = {};

  if (type === 'youtube') {
    const videoId = youtubeVideoId(resolvedUrl);
    meta = await youtubeOembed(videoId);
    if (!meta.title) meta = await fetchMeta(resolvedUrl);
  } else {
    meta = await fetchMeta(resolvedUrl);
  }

  const result = {
    url: rawUrl,
    resolvedUrl: resolvedUrl !== rawUrl ? resolvedUrl : undefined,
    type,
    title: meta.title || resolvedUrl,
    description: meta.description || undefined,
  };

  if (type === 'youtube') {
    result.videoId = youtubeVideoId(resolvedUrl);
    if (meta.thumbnail) result.thumbnail = meta.thumbnail;
    if (meta.authorName) result.channelName = meta.authorName;
  }

  console.log(`    [${type}] "${result.title}"`);
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const data = JSON.parse(await fs.readFile(SCP_DATA, 'utf8'));
  let totalFound = 0;

  for (const shiur of data.shiurim) {
    const pdfPath = path.join(PUBLIC_DIR, `shiur-${shiur.number}`, 'notes.pdf');

    let rawUrls = [];
    try {
      const buf = await fs.readFile(pdfPath);
      rawUrls = extractUrisFromPdf(buf);
    } catch {
      // PDF not present — preserve existing enriched links if any
      if (!Array.isArray(shiur.notesLinks)) shiur.notesLinks = [];
      console.log(`Shiur ${shiur.number}: notes.pdf not found, skipping`);
      continue;
    }

    if (rawUrls.length === 0) {
      shiur.notesLinks = [];
      console.log(`Shiur ${shiur.number}: no links found`);
      continue;
    }

    console.log(`Shiur ${shiur.number}: ${rawUrls.length} link(s) found`);

    // Build a map of previously-enriched links so we don't re-fetch unchanged URLs
    const existing = {};
    for (const link of (shiur.notesLinks ?? [])) {
      if (link && typeof link === 'object') existing[link.url] = link;
    }

    const enriched = [];
    for (const url of rawUrls) {
      if (existing[url]) {
        console.log(`  → (cached) ${url}`);
        enriched.push(existing[url]);
      } else {
        enriched.push(await enrichLink(url));
      }
    }

    shiur.notesLinks = enriched;
    totalFound += enriched.length;
  }

  await fs.writeFile(SCP_DATA, JSON.stringify(data, null, 2));
  console.log(`\nDone. ${totalFound} enriched link(s) across all shiurim.`);
}

main().catch(err => {
  console.error('extract-pdf-links failed:', err.message);
  process.exit(1);
});
