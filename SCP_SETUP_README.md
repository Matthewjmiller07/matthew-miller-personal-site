# SCP Google Drive Sync Setup

This automatically pulls shiur audio and notes from Google Drive at build time.

## Quick Decision: Which Auth Method?

| If the Drive folder is... | Use this method |
|---------------------------|-----------------|
| **Public** ("Anyone with the link can view") | **API Key** - Easiest, just one key |
| **Private** (requires specific access) | **Service Account** - More secure |

## Folder Structure

Your Google Drive folder can be nested - the script searches recursively:

```
SCP/ (root folder ID: 1xsWSHOQGk8aO3u2Qq1qVEG2-fhjvhHe6)
└── Semichas Chaburah Program/
    └── Shiur #1: Intro to Nat bar Nat/
        ├── Scp 1.m4a              (audio file)
        └── Shiur #1: ... (Google Doc)  → exported as notes.pdf
```

Or flat structure:
```
SCP/
├── shiur-1/
│   ├── audio.mp3
│   └── notes.pdf
└── shiur-2/
    └── ...
```

**Supported files:**
- **Audio:** `.m4a`, `.mp3` → `audio.m4a` or `audio.mp3`
- **Notes:** `.pdf`, `.doc`, `.docx`, Google Docs → `notes.pdf`
- **Transcript:** `.srt` → `transcript.srt`

**Note:** Google Docs are automatically exported as PDFs!

## Transcription (Sofer AI)

Sofer AI bills per submission, so the sync keeps a ledger of every job it has ever
submitted at `src/data/scp-transcription-jobs.json`, committed back to the repo by the
workflow. A shiur is submitted **once**; if the run times out, crashes, or the account
runs out of credit, the next run resumes that same job ID instead of paying again.

A shiur is skipped entirely if it already has `src/data/scp-<id>-transcript.json` or a
non-empty `public/scp/<id>/transcript.srt`.

**If the balance runs out**, the run stops the whole transcription pass rather than
submitting the remaining shiurim. Top up at sofer.ai and the next run picks the stuck
jobs back up — no new charge.

**To force a re-transcription**, delete that shiur's entry from the ledger (and its
transcript files). Replacing the audio file also resets it automatically, since the
ledger records the audio's byte size.

Guardrails, both env-overridable:

| Variable | Default | Meaning |
|---|---|---|
| `SOFER_MAX_NEW_JOBS` | `2` | New submissions allowed per run |
| `SOFER_MAX_SUBMISSIONS` | `2` | Lifetime submissions per shiur before it stops retrying |

## Setup Option 1: API Key (Easiest - For Public Folders)

Use this if the Rabbi shared the folder with "Anyone with the link can view"

### 1. Get API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Go to **APIs & Services** → **Library**
4. Enable **Google Drive API**
5. Go to **APIs & Services** → **Credentials**
6. Click **Create Credentials** → **API Key**
7. Copy the key (looks like: `AIza...`)

### 2. Configure Environment

```bash
GOOGLE_DRIVE_SCP_FOLDER_ID=1xsWSHOQGk8aO3u2Qq1qVEG2-fhjvhHe6
GOOGLE_DRIVE_API_KEY=AIza...
```

That's it! No service account needed.

## Setup Option 2: Service Account (For Private Folders)

Use this if the folder is private and requires specific sharing.

### 1. Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the **Google Drive API**
4. Go to **IAM & Admin** → **Service Accounts**
5. Create a service account with **Viewer** role
6. Create a key (JSON) and download it

### 2. Share Your Drive Folder

1. In Google Drive, right-click your SCP folder
2. Click **Share**
3. Add the service account email (looks like: `name@project-id.iam.gserviceaccount.com`)
4. Give it **Viewer** access

### 3. Configure Environment

Option A: Paste JSON key directly:
```bash
# Copy the entire JSON file content and paste as single line
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

Option B: Point to credentials file:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### 4. Set Folder ID

Already set in `.env.example`:
```bash
GOOGLE_DRIVE_SCP_FOLDER_ID=1xsWSHOQGk8aO3u2Qq1qVEG2-fhjvhHe6
```

## How It Works

- `npm run build` now runs `npm run sync:scp` first
- Sync script downloads files from Drive to `public/scp/shiur-N/`
- Only downloads if file doesn't exist or size changed
- Then Astro builds with the synced files

## Manual Sync

To sync without building:
```bash
npm run sync:scp
```

## Local Development

For local dev, you have two options:

1. **Run sync once**: `npm run sync:scp` then `npm run dev`
2. **Copy files manually**: Just drop MP3/PDF files into `public/scp/shiur-1/`

The sync only runs automatically during `npm run build`.

## Netlify Deployment

To make this work on Netlify builds:

### 1. Add Environment Variables in Netlify

Go to **Site settings** → **Environment variables** and add:

**For Public Folders (API Key - Easiest):**
| Variable | Value |
|----------|-------|
| `GOOGLE_DRIVE_SCP_FOLDER_ID` | `1xsWSHOQGk8aO3u2Qq1qVEG2-fhjvhHe6` |
| `GOOGLE_DRIVE_API_KEY` | `AIza...` (your API key) |

**For Private Folders (Service Account):**
| Variable | Value |
|----------|-------|
| `GOOGLE_DRIVE_SCP_FOLDER_ID` | `1xsWSHOQGk8aO3u2Qq1qVEG2-fhjvhHe6` |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Paste the entire JSON content |

**Important for Service Account**: When pasting the JSON, make sure it's a single line. You can use this command to convert:
```bash
cat service-account-key.json | jq -c .
```

### 2. Verify Build Settings

In **Site settings** → **Build & deploy** → **Build settings**:
- Build command: `npm run build` (already set up to sync first)
- Publish directory: `dist`

### 3. Test Deploy

Push to git and watch the build logs. You should see:
```
🎧 Syncing SCP files from Google Drive...
📁 Shiur #1: Intro to Nat bar Nat (shiur-1):
  ⬇️  Downloading audio.m4a...
  ⬇️  Downloading notes.pdf...
✅ SCP sync complete!
```

### 4. For Service Account Only: Rabbi Shares Drive

If using service account, the Rabbi needs to:
1. Get your service account email (looks like `name@project-id.iam.gserviceaccount.com`)
2. Right-click the SCP folder → **Share**
3. Add the service account email with **Viewer** access

## GitHub Actions Automation (Auto-Sync + Auto-Deploy)

The easiest setup: GitHub Actions checks for new shiurim every hour and auto-deploys.

### 1. Add Secrets to GitHub

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Value |
|-------------|-------|
| `GOOGLE_DRIVE_SCP_FOLDER_ID` | Your Drive folder ID (e.g., `1xsWSHOQGk8aO3u2Qq1qVEG2-fhjvhHe6`) |
| `GOOGLE_DRIVE_API_KEY` | Your API key (if using public folder) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Service account JSON (if using private folder) |

### 2. How It Works

- **Every hour**: GitHub Actions runs `sync-scp-drive.js`
- **If new shiurim found**: Commits changes to `scp.json` + downloaded files
- **Auto-deploy**: Netlify auto-deploys when GitHub Actions pushes the commit (usually within 1-2 minutes)

### 3. Manual Trigger

You can also run the workflow manually:
- Go to **Actions** → **Sync SCP from Google Drive** → **Run workflow**

## Troubleshooting

**"Skipping Drive sync" message**: Set `GOOGLE_DRIVE_SCP_FOLDER_ID` in your `.env` or Netlify env vars

**"No credentials found"**: Set either `GOOGLE_SERVICE_ACCOUNT_KEY` or `GOOGLE_APPLICATION_CREDENTIALS`

**"Permission denied"**: Make sure the service account email has been added to the Drive folder share by the Rabbi

**Files not downloading**: Check that folders are named like `Shiur #1: ...`, `shiur-2`, etc. (script extracts number from folder name)

**Build fails on Netlify**: Check build logs - the sync runs before Astro build, so any sync errors will show up there

**GitHub Actions not running**: Check that secrets are set correctly in **Settings** → **Secrets and variables** → **Actions**
