# Mega Bible API

Personal Tanakh scholarship API for **theothermatthewmiller.com**, powered by:
- 217 personal Tanakh Annotations (Supabase)
- 220 Literary Bible entries (Supabase)  
- Sefaria.org — Hebrew + English text
- Open Bible — cross-references

Live at: `https://theothermatthewmiller.com/api/bible/`

---

## Deploy

```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

Done. Worker is live at `https://mega-bible-api.<your-subdomain>.workers.dev`  
AND at `https://theothermatthewmiller.com/api/bible/*` (via routes in wrangler.toml).

---

## Switching Auth Modes

### Make it public (default)
In `wrangler.toml`:
```toml
[vars]
API_MODE = "public"
```
Then `wrangler deploy`. Anyone can read your annotations.

### Make it private (you only)
1. Set your secret key (one time):
   ```bash
   wrangler secret put API_SECRET_KEY
   # Enter any strong password when prompted
   ```
2. In `wrangler.toml`:
   ```toml
   [vars]
   API_MODE = "private"
   ```
3. `wrangler deploy`

Now all requests need the header:
```
X-API-Key: your-secret-key
```

In Claude.ai, just say: *"Fetch https://theothermatthewmiller.com/api/bible/verse/Genesis/1/1 with header X-API-Key: yourkey"*

---

## Endpoints

All endpoints live at `theothermatthewmiller.com/api/bible/...`

| Endpoint | Description |
|---|---|
| `GET /api/bible/verse/:book/:chapter/:verse` | Full verse data — text, annotations, literary devices, cross-refs |
| `GET /api/bible/book/:book` | All annotations for a book |
| `GET /api/bible/device/:device` | All verses tagged with a literary device |
| `GET /api/bible/search?q=` | Search comments, words, and notes |
| `GET /api/bible/devices` | List all literary devices |
| `GET /api/bible/books` | List all annotated books |

### Examples
```
/api/bible/verse/Genesis/22/14
/api/bible/verse/Psalms/23/1
/api/bible/book/Isaiah
/api/bible/device/Chiasmus
/api/bible/search?q=binding
/api/bible/devices
/api/bible/books
```

---

## Using with Claude.ai

In Claude.ai, just ask:

> "Fetch https://theothermatthewmiller.com/api/bible/verse/Genesis/22/14 and explain the literary devices"

> "Search https://theothermatthewmiller.com/api/bible/search?q=chiasmus and summarize the results"

> "Get all annotations for https://theothermatthewmiller.com/api/bible/book/Psalms"

Claude fetches the JSON, synthesizes it — zero API cost beyond your Claude.ai subscription.

---

## Files

| File | Purpose |
|---|---|
| `index.js` | Cloudflare Worker — all routing, auth, and API logic |
| `wrangler.toml` | Deployment config — domain routing, auth mode |
