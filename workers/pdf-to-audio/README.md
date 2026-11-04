# pdf-to-audio Worker

Cloudflare Worker backing the `/pdf-to-audio` prototype page: it synthesizes speech
(Kokoro on a Replicate T4 GPU, about 30x realtime per stream and about 1 cent per 30
minutes of audio), MP3 uploads land in R2, and a tokenized RSS feed serves them to
podcast apps.

## One-time setup (needs Cloudflare auth — see below)

```bash
cd workers/pdf-to-audio
wrangler r2 bucket create pdf-audio
wrangler secret put REPLICATE_API_TOKEN
wrangler deploy
```

The Worker serves `https://pdf-to-audio.parasha.workers.dev`:

- `POST /tts` — JSON `{ text }` (up to 4,000
  characters). Returns `{ url }`, a short-lived 24 kHz mono WAV the browser fetches.
- `POST /upload` — headers `X-Feed-Token`, `X-Filename` (`*.mp3`), `X-Duration-Seconds`; body = MP3 bytes.
  Returns `{ feedUrl, audioUrl, bytes }`.
- `GET /feed/<token>.xml` — RSS 2.0 with `<enclosure>` per MP3 under that token.
- `GET /audio/<token>/<file>` — the MP3, with native R2 `Range` support (206).

## Page config

`src/scripts/pdf-to-audio.ts` has `PDF_AUDIO_CONFIG.uploadEnabled`. It is `false`
until the bucket + Worker are live; flip it to `true` when they are. In stub mode
only the upload is off, and the feed downloads as a client-side XML file.

## Limits

There is no key. `POST /tts` and `POST /upload` only accept the site's own origins, and a
daily budget in R2 (`_budget/<date>-<kind>`) caps speech at about 1M characters (about 40
cents) and uploads at 1 GB. Over the cap they return 402.

Deploying needs `wrangler login` or a `CLOUDFLARE_API_TOKEN` with Workers Edit + R2 Edit.
