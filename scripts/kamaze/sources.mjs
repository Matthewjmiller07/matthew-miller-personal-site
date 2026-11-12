// Readers for the price files Israeli chains must publish under the price-transparency
// regulations (תקנות שקיפות מחירים). Each source exposes stores() / files(store) / download(file),
// so adding a chain means adding one object to SOURCES. Today that is Shufersal's open site
// (prices.shufersal.co.il), which needs no login.
import { gunzipSync, inflateRawSync } from 'node:zlib';

export const UA = 'kama-ze/1.0 (Raanana price comparison; reads public price-transparency files)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRetry(url, opts = {}, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { 'User-Agent': UA, ...(opts.headers || {}) },
        signal: AbortSignal.timeout(opts.timeout || 120000),
      });
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastErr = err;
      await sleep(1500 * (i + 1));
    }
  }
  throw new Error(`${url.split('?')[0]}: ${lastErr?.message || lastErr}`);
}

/** Price files arrive as gzip, as a zip holding one XML, or as bare XML. */
export function unpack(buf) {
  if (buf[0] === 0x1f && buf[1] === 0x8b) return decode(gunzipSync(buf));
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    // Single-entry zip: read the local file header and inflate.
    const method = buf.readUInt16LE(8);
    const nameLen = buf.readUInt16LE(26);
    const extraLen = buf.readUInt16LE(28);
    const start = 30 + nameLen + extraLen;
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    const compSize = eocd > 0 ? buf.readUInt32LE(eocd + 20) : buf.length - start;
    const body = buf.subarray(start, start + compSize);
    return decode(method === 0 ? body : inflateRawSync(body));
  }
  return decode(buf);
}

function decode(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf);
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf);
  const head = buf.subarray(0, 200).toString('latin1');
  const m = head.match(/encoding="([^"]+)"/i);
  const enc = m ? m[1].toLowerCase() : 'utf-8';
  try {
    return new TextDecoder(enc === 'iso-8859-8' ? 'windows-1255' : enc).decode(buf);
  } catch {
    return new TextDecoder('utf-8').decode(buf);
  }
}

// ---------- tiny XML helpers (the files are flat and regular) ----------

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export const unescapeXml = (s) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : all;
    }
    return ENT[e.toLowerCase()] ?? all;
  });

/** Yield the inner XML of every <tag>...</tag> block (case-insensitive tag name). */
export function* blocks(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml))) yield m[1];
}

/** First value of a child element, trimmed and unescaped. */
export function field(block, ...names) {
  for (const name of names) {
    const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
    if (m) return unescapeXml(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).trim();
  }
  return '';
}

// ---------- store lists ----------

export const RAANANA_CODE = '8700'; // Central Bureau of Statistics locality code
const isRaanana = (city, name = '', address = '') =>
  city === RAANANA_CODE || /רעננה/.test(city) || /ראננה/.test(city) || /רעננה/.test(name) || /רעננה/.test(address);

export function parseStores(xml) {
  const chainName = field(xml, 'ChainName');
  const chainId = field(xml, 'ChainId', 'ChainID');
  const out = [];
  // Sub-chain names give the store format (Shufersal Deal / Sheli / Express ...).
  const subNames = new Map();
  for (const sc of blocks(xml, 'SubChain')) {
    subNames.set(field(sc, 'SubChainId', 'SubChainID'), field(sc, 'SubChainName'));
  }
  const subRe = /<SubChain(?:\s[^>]*)?>([\s\S]*?)<\/SubChain>/gi;
  const scan = (chunk, subId) => {
    for (const s of blocks(chunk, 'Store')) {
      const store = {
        chainId,
        chainName,
        subChainId: field(s, 'SubChainId', 'SubChainID') || subId || '',
        storeId: String(parseInt(field(s, 'StoreId', 'StoreID'), 10)),
        name: field(s, 'StoreName'),
        address: field(s, 'Address'),
        city: field(s, 'City'),
        zip: field(s, 'ZipCode', 'ZIPCode'),
        type: field(s, 'StoreType'),
      };
      store.subChainName = subNames.get(store.subChainId) || '';
      if (store.storeId !== 'NaN') out.push(store);
    }
  };
  let m;
  let any = false;
  while ((m = subRe.exec(xml))) {
    any = true;
    scan(m[1], field(m[1], 'SubChainId', 'SubChainID'));
  }
  if (!any) scan(xml, '');
  return out;
}

export const raananaStores = (stores) =>
  stores.filter((s) => isRaanana(s.city, s.name, s.address) && s.type !== '2' /* 2 = online-only */);

// ---------- Shufersal ----------

const SHUFERSAL = 'https://prices.shufersal.co.il';

async function shufersalList(catID, storeId) {
  const files = [];
  for (let page = 1; page <= 20; page++) {
    const url = `${SHUFERSAL}/FileObject/UpdateCategory?catID=${catID}&storeId=${storeId}&page=${page}`;
    const html = await (await fetchRetry(url)).text();
    const links = [...html.matchAll(/href="(https:\/\/pricesprodpublic[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    if (!links.length) break;
    for (const link of links) {
      const name = decodeURIComponent(link.split('?')[0].split('/').pop());
      files.push({ name, url: link });
    }
    if (!/page=\d+[^"]*"[^>]*>\s*&gt;/.test(html) && links.length < 20) break;
  }
  return files;
}

const stamp = (name) => (name.match(/-(\d{12})/) || name.match(/-(\d{8})/) || [, '0'])[1];
const latest = (files) => files.slice().sort((a, b) => stamp(b.name).localeCompare(stamp(a.name)))[0];

export const shufersal = {
  key: 'shufersal',
  async stores() {
    const f = latest(await shufersalList(5, 0));
    const xml = unpack(Buffer.from(await (await fetchRetry(f.url)).arrayBuffer()));
    return parseStores(xml);
  },
  async files(store) {
    const [price, promo] = await Promise.all([shufersalList(2, store.storeId), shufersalList(4, store.storeId)]);
    return { price: latest(price), promo: latest(promo) };
  },
  async download(file) {
    return unpack(Buffer.from(await (await fetchRetry(file.url)).arrayBuffer()));
  },
};

export const SOURCES = [shufersal];
