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

Text that is more than a fifth Hebrew letters goes to Gemini TTS on Replicate instead of Kokoro, at
about 1.5 cents per minute of audio. It has its own counters per day: 600 characters per person (about a
minute), 2,000 for everyone (about 5 cents), and 10,000 for the owner (about 18 minutes, 25 cents).

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
