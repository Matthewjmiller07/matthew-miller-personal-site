# pdf-to-audio Worker

Cloudflare Worker backing the `/pdf-to-audio` prototype page: MP3 uploads land in
R2, and a tokenized RSS feed serves them to podcast apps.

## One-time setup (needs Cloudflare auth — see below)

```bash
cd workers/pdf-to-audio
wrangler r2 bucket create pdf-audio
wrangler secret put UPLOAD_TOKEN   # shared bearer token; the page reads it from #key=...
wrangler deploy
```

The Worker serves `https://pdf-to-audio.parasha.workers.dev`:

- `POST /upload` — `Authorization: Bearer <UPLOAD_TOKEN>`, headers
  `X-Feed-Token`, `X-Filename` (`*.mp3`), `X-Duration-Seconds`; body = MP3 bytes.
  Returns `{ feedUrl, audioUrl, bytes }`.
- `GET /feed/<token>.xml` — RSS 2.0 with `<enclosure>` per MP3 under that token.
- `GET /audio/<token>/<file>` — the MP3, with native R2 `Range` support (206).

## Page config

`src/scripts/pdf-to-audio.ts` has `PDF_AUDIO_CONFIG.uploadEnabled`. It is `false`
until the bucket + Worker are live; flip it to `true` when they are. In stub mode
the page still extracts, synthesizes, and downloads MP3s — only the upload is off,
and the feed downloads as a client-side XML file.

## Auth

Deployment needs either `wrangler login` (interactive) or a `CLOUDFLARE_API_TOKEN`
with Workers Edit + R2 Edit permissions. The token is never committed; the
`UPLOAD_TOKEN` secret is the only credential the page ever sees, and only via the
`#key=` URL hash or a manual field — it is not stored in the repo.
