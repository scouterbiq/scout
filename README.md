# Scout Engine

The backend for Scout — a lead-gen pipeline for corporate training leads.
$0/month, runs itself in the cloud once set up, no terminal required after
the initial upload.

## How it works

```
Google News RSS  ->  fetch_alerts.py  ->  enrich.py (Gemini, one call)  ->  store.py (dedupe + priority tiers)  ->  data/leads.csv  ->  dashboard/scout.html
```

GitHub Actions runs this whole chain on a daily schedule, entirely on
GitHub's servers, and commits the result back to this same repo.

## What makes a lead "top priority"

Every lead gets a `sizeTier` (SME / Enterprise / Unknown) and a `levySignal`
(confirmed / likely / unclear - whether they're actively spending HRD Corp
levy funds, not just legally registered for it, which is almost everyone).
Those combine into `priorityTier`:

- **top** - SME + actively spending levy budget (the best fit)
- **good** - SME, budget situation just unclear
- **enterprise** - large company, set aside with an `accessNote` explaining
  why (currently: lacks the formal vendor registration large companies
  require) - still shown, just not the primary focus
- **unclassified** - not enough information either way

This exists because the trainer this was built for currently operates
independently rather than through a training provider company, so large
enterprises are harder to close right now even when they're a great fit
otherwise - small and mid-size companies are the realistic near-term
priority.

**Hard rule, never compromise on this**: no fabricated contact names,
phone numbers, or emails, anywhere in this codebase. If a real source
doesn't provide one, it stays blank. The dashboard shows a "not yet
identified, check the source" state for exactly this case, on purpose.

## Getting this live - entirely from a web browser, no terminal needed

### 1. Create a GitHub account if you don't have one
github.com - free.

### 2. Create a new repository
Click the "+" top right -> New repository. Name it (e.g. `scout`), set it
to Private or Public (Public is fine - the data here is prospect company
names, nothing sensitive), don't initialize with a README (this project
already has one).

### 3. Upload this project
On the new empty repo's page, click "uploading an existing file." Extract
this project's zip on your computer first, then **drag the extracted
folder's contents** (not the zip file itself) into the upload area. Modern
browsers preserve the folder structure when you drag a whole folder in.
Commit the upload.

### 4. Add your Gemini API key as a secret
Get a free key at https://aistudio.google.com/apikey (no card needed).
In your repo: Settings -> Secrets and variables -> Actions -> New repository
secret. Name it exactly `GEMINI_API_KEY`, paste your key, save.

### 5. Allow the workflow to write back to the repo
Settings -> Actions -> General -> scroll to "Workflow permissions" -> select
"Read and write permissions" -> Save.

### 6. Trigger the first run manually (don't wait for the schedule)
Go to the "Actions" tab -> click "Daily lead scan" in the left sidebar ->
click "Run workflow" button -> Run workflow. Watch it run (takes a minute
or two). This is also fully browser-based, no local machine involved.

### 7. Turn on GitHub Pages to get a live URL
Settings -> Pages -> under "Build and deployment," set Source to "Deploy
from a branch," Branch to `main`, folder to `/ (root)`. Save. GitHub gives
you a URL after a minute, something like
`https://yourusername.github.io/scout/dashboard/scout.html`

### 8. Open that URL
If step 6's run found any leads, you'll see them with the "Live" badge.
If it found zero (quite possible on the very first run - the feeds need a
moment and not every day has fresh matches), you'll see the demo data with
a "Demo data" badge instead - that's the graceful fallback working
correctly, not a failure.

From here on, it runs on its own, once a day, forever, for free. That URL
works from any device, any browser - including whichever PC you're on.

## Testing without spending anything or touching the real network

```
python tests/test_pipeline.py
```

Runs the full fetch -> enrich -> dedupe -> priority-tier flow with mocked
data - no network calls, no API key needed.

## Adding a lead you found yourself

```
python add_lead.py
```

Interactive prompts, walks you through one lead at a time. Goes through
the same dedupe/priority-tier logic as the automated pipeline, just
labeled `addedBy: manual` so it's traceable later. This one does need to
run locally (needs your terminal), unlike everything else above.

## What to check once this has run for a few real days

- Are the Google News RSS feeds actually returning relevant results? Open
  `data/leads.csv` and read a few entries - if they're consistently
  off-topic, the search queries in `config.py`'s `ALERT_FEEDS` may need
  adjusting. (Worth knowing: these feeds were written from known-working
  patterns but never verified end-to-end from a real network before this
  went live - the first run's actual output is the real test.)
- Is `sizeTier`/`priorityTier` classification actually landing correctly?
  A `top`-tier lead should genuinely feel like a good, actionable fit -
  if it doesn't, the enrichment prompt in `enrich.py` may need tightening.
- One separate, real business step outside this tool entirely: worth
  confirming directly with HRD Corp whether becoming a Registered Training
  Provider is realistic - that single certification is what would unlock
  every `enterprise`-tier lead this system finds.
