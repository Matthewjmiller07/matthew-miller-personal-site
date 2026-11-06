# Ross Reads It Worker

Backs `/ross`: speech (Kokoro on a Replicate T4 GPU, about 1 cent per 25,000 characters),
daily limits, and private podcast feeds with MP3s in R2.

## Setup

```bash
cd workers/rossreadsit
wrangler d1 execute rossreadsit --remote --file schema.sql
wrangler secret put REPLICATE_API_TOKEN
wrangler secret put IP_SALT   # any long random string
wrangler deploy
```

## Hebrew

Text that is more than a fifth Hebrew letters goes to Google's WaveNet voice (`he-IL-Wavenet-B`, on
project `personal-site-460904`) instead of Kokoro. Google gives 4M characters free a month, then $4 per
1M. It has its own counters, with the same per-person limits as English, plus a cap of 125,000 characters
a day across everyone, the owner included, so a 31-day month stays inside the free tier. Needs
`wrangler secret put GOOGLE_TTS_API_KEY`, with the key restricted to the Text-to-Speech API.

## Cover art

The page draws each feed's cover (Ross and the feed's title) on a canvas and uploads it with
`PUT /feeds/:token/cover`. A rename redraws it under a new file name, because podcast apps hold on to
art by URL. The empty default feed uses `public/ross/cover.png` until it holds an episode.

## Feed links

A new feed can have a chosen link name, such as `ethics-code-1a2b3c4d`. The 8 random characters stay, because a feed
link is all anyone needs to listen. The link can't change later, since podcast apps subscribe to it.

## Limits

In `worker.js`. Per day: 4,500 characters per person (about 5 minutes), 27,500 once they leave
an email (about 30 minutes), and 125,000 for everyone together (about 5 cents). A person is
counted by both their browser's library id and a salted hash of their IP. A row in `users` with
`daily_limit` set is exempt from the shared cap, which is how the owner reads whole books:

```bash
wrangler d1 execute rossreadsit --remote --command "UPDATE users SET daily_limit = 500000 WHERE library = '...'"
```

Emails are not verified and no mail is sent. List them with
`wrangler d1 execute rossreadsit --remote --command "SELECT email, created FROM users WHERE email IS NOT NULL"`.
