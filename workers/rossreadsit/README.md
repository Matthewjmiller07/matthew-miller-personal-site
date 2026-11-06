# Ross Reads It Worker

Backs `/ross`: speech (Kokoro on a Replicate T4 GPU, about 1 cent per 25,000 characters),
free reading, paid years, and private podcast feeds with MP3s in R2.

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
1M. It has its own counters, and free Hebrew is capped at 125,000 characters a day across everyone. Paid Hebrew can
pass the free tier, at about $2 a day per library at most. Needs
`wrangler secret put GOOGLE_TTS_API_KEY`, with the key restricted to the Text-to-Speech API.

## Cover art

The page draws each feed's cover (Ross and the feed's title) on a canvas and uploads it with
`PUT /feeds/:token/cover`. A rename redraws it under a new file name, because podcast apps hold on to
art by URL. The empty default feed uses `public/ross/cover.png` until it holds an episode.

## Free reading and paying

In `worker.js`. Each library gets 4,500 characters free, once (about 5 minutes). Free reading is also capped per
day at 27,500 characters per hashed IP and 125,000 for everyone together in each language (about 5 cents of
English). After that a year costs $10 through Stripe Checkout: one payment, no renewal. Paid reading has only a
guard against a leaked link or a script, about $2 a day per library.

There is no webhook. `/checkout` stores the session id on the user's row, and `/me` asks Stripe about it, so
someone who pays and closes the tab gets their year on their next visit. Needs the secret `STRIPE_SECRET_KEY`.

Promo codes are made in Stripe (a 100% off coupon, plus a promotion code on it) and typed on the Checkout page,
which asks for no card when the total is zero. Cap them with `max_redemptions`: each one is a free year of reading.

A row in `users` with `daily_limit` set never has to pay, which is how the owner reads:

```bash
wrangler d1 execute rossreadsit --remote --command "UPDATE users SET daily_limit = 500000 WHERE library = '...'"
```

Give someone a year by hand, or take it back after a refund, by setting `paid_until`.

