export const prerender = true;

import scpData from '../../data/scp.json';

const SITE_URL = 'https://theothermatthewmiller.com';

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const { series, shiurim } = scpData;

  const items = shiurim.map(shiur => {
    const audioUrl = shiur.audioFile
      ? `${SITE_URL}${shiur.audioFile}`
      : null;
    const notesUrl = shiur.notesFile
      ? `${SITE_URL}${shiur.notesFile}`
      : null;
    const pubDate = new Date(shiur.date).toUTCString();
    const guid = `${SITE_URL}/scp#${shiur.id}`;

    const description = [
      shiur.description,
      notesUrl ? `Notes: ${notesUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    return `
    <item>
      <title>${escapeXml(`Shiur ${shiur.number}: ${shiur.title}`)}</title>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <link>${SITE_URL}/scp</link>
      <itunes:title>${escapeXml(`Shiur ${shiur.number}: ${shiur.title}`)}</itunes:title>
      <itunes:summary><![CDATA[${shiur.description}]]></itunes:summary>
      <itunes:duration>${escapeXml(shiur.duration)}</itunes:duration>
      <itunes:episode>${shiur.number}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      ${audioUrl ? `<enclosure url="${escapeXml(audioUrl)}" type="audio/mpeg" length="0"/>` : ''}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(series.title)}</title>
    <description>${escapeXml(series.description)}</description>
    <link>${SITE_URL}/scp</link>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/scp/feed.xml" rel="self" type="application/rss+xml"/>
    <itunes:author>${escapeXml(series.instructor)}</itunes:author>
    <itunes:summary>${escapeXml(series.description)}</itunes:summary>
    <itunes:subtitle>${escapeXml(series.subtitle)}</itunes:subtitle>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Religion &amp; Spirituality"/>
    <itunes:image href="${SITE_URL}/scp/cover.jpg"/>
    <image>
      <url>${SITE_URL}/scp/cover.jpg</url>
      <title>${escapeXml(series.title)}</title>
      <link>${SITE_URL}/scp</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
