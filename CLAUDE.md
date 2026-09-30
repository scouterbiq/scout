# Scout — project context for Claude Code

Read this fully before doing anything. This is a lead-generation tool being
built as a gift for my dad, a corporate trainer in Malaysia. Zero-dollar
budget, indefinitely, no free-tier limits ever hit. Two parts: a Python
pipeline (`/`) that finds and enriches leads, and a dashboard (`/dashboard`)
that displays them. The pipeline is built and unit-tested with mocks; it has
**never made a real network call** — I was building it in a sandboxed
environment with no access to Google or Gemini's servers. That's the first
thing to fix.

## The business context (don't lose this — it's load-bearing)

Training lines my dad delivers: Communication Skills, Professional Business
Writing, Critical Thinking and Problem Solving, AI Tools for Workplace
Productivity.

His real client sectors, used for lead scoring and the "fitNote" field
(never invent anything new about these real companies — only reference the
sector match): Oil & Gas (Petronas, Velesto, Deleum) · Automotive (Federal
Auto, Sime Motors, Cycle & Carriage, Mitsubishi, Proton) · FMCG (Lam Soon,
Tesco) · Manufacturing (Siemens, Nippon Paints, Panasonic, Infineon) ·
Healthcare (KPJ Group, Smith & Nephew) · IT Solutions (NCR, Hitachi Vantara)
· NGO (Mercy Malaysia) · Education (Newcastle University, Curtin University,
College UEM) · Banks (Affin Bank, Agrobank, Bangkok Bank, Bank Muamalat, Al
Rajhi). Full detail already encoded in `config.py`.

**HRD Corp / HRDF levy**: since 2021, nearly every private Malaysian
employer with 10+ staff is mandatorily levy-registered by law — that alone
isn't a useful filter. What matters is evidence a company is *actively
spending* the levy (e.g. a job post or course listing says "HRDF claimable"
/ "HRD Corp claimable"). Every lead carries a `levySignal` field
(`confirmed` / `likely` / `unclear`) for exactly this reason. Don't remove
or weaken this.

**Hard rule, never compromise on this**: never fabricate contact names,
phone numbers, or emails. If a real source doesn't provide one, leave the
field blank — the dashboard already handles that gracefully with a
"not yet identified, here's the source" fallback. This was a deliberate
design decision, not an oversight.

## Current state

- `config.py` — all settings, the sector/client taxonomy, training lines,
  the lead schema. `ALERT_FEEDS` is currently empty (placeholder comments
  only) — needs real Google Alerts RSS feed URLs.
- `fetch_alerts.py` — pulls entries from each RSS feed in `ALERT_FEEDS`.
  Untested against a real feed.
- `enrich.py` — builds one prompt from the day's aggregated alerts, calls
  Gemini once (`gemini-2.0-flash`, `responseMimeType: application/json`),
  returns a parsed JSON array. Needs a real `GEMINI_API_KEY` in `.env`
  (free at https://aistudio.google.com/apikey, no card). Untested against
  the real API — the JSON-mode config *should* prevent markdown-fenced
  output but that's unverified against the live endpoint.
- `store.py` — dedupes by `company + sourceUrl`, appends new leads to
  `data/leads.json`, exports `data/leads.csv`. This part IS fully tested
  (see `tests/test_pipeline.py`, all mocked, no network) and works.
- `main.py` — runs the three stages in order.
- `dashboard/scout.html` — the finished UI, single self-contained file, no
  build step. Currently reads sample/demo data by default. Has a
  `CONFIG.SHEET_CSV_URL` variable near the top of its `<script>` block that,
  if set, fetches and parses a CSV from that URL instead — currently blank.
  **This was designed around a published-Google-Sheet CSV, but nothing
  requires that specifically — any URL serving CSV in the same column
  order works**, including a raw GitHub file URL.

## Current state (updated after the SME-priority and browser-only deploy work)

- `config.py` — Google News RSS search feeds instead of manual Google
  Alerts, works with no account setup. Full sector/training/levy taxonomy.
  `LEAD_FIELDS` includes `sizeTier`, `accessNote`, `priorityTier`, `addedBy`.
- `fetch_alerts.py` — unchanged, pulls entries from any RSS feed.
- `enrich.py` — prompt now also classifies `sizeTier`/`accessNote` per lead,
  explained by the trainer currently operating independently (no formal
  vendor registration large enterprises require).
- `store.py` — ids are a stable hash of company+sourceUrl (never a counter —
  this matters now that leads arrive from the automated pipeline AND
  manual entry AND possibly concurrent GitHub Actions runs).
  `priorityTier` is computed here deterministically from `sizeTier` +
  `levySignal`, not left to the LLM.
- `add_lead.py` — interactive manual entry, goes through the same
  dedupe/priority logic, tags `addedBy: "manual"`.
- `.github/workflows/daily-scan.yml` — runs the pipeline daily on GitHub's
  own servers and commits the result back. This is the automation piece
  that makes the whole thing require zero ongoing terminal use.
- `dashboard/scout.html` — `CONFIG.SHEET_CSV_URL` is a relative path
  (`../data/leads.csv`), works automatically once hosted via GitHub Pages
  with no per-repo editing needed.
- Tests cover all four `priorityTier` outcomes plus dedupe and id-safety
  across auto+manual sources — all passing as of this write, but **never
  verified against the real Gemini API or real RSS feeds from a real
  network** (sandboxed environment, no external network access). The
  first real run in GitHub Actions is the actual first real-world test.

## What NOT to change without discussion

- The zero-cost constraint. Every tool in this stack was chosen
  specifically to have a generous free tier with no card required
  (Google Alerts, Gemini API free tier, GitHub Actions free minutes,
  Google Sheets). Don't introduce a paid dependency to solve a problem —
  flag the tradeoff instead.
- The no-fabricated-contacts rule.
- The sector/training-line taxonomy and the fitNote mechanism — this is
  the actual differentiator of the whole tool, not incidental detail.
