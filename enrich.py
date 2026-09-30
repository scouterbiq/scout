"""
Stage 2: send the day's aggregated alert text to Gemini once, get back a
structured JSON array of leads. One API call regardless of how many alert
entries there are — this is the batching that keeps this free indefinitely.
"""
import json
import requests
from config import GEMINI_API_KEY, GEMINI_URL, SECTORS, TRAINING_LINES


def build_prompt(alert_text):
    sector_lines = "\n".join(
        f"- {sector}: {', '.join(clients)}" for sector, clients in SECTORS.items()
    )
    training_lines = "\n".join(f"- {t}" for t in TRAINING_LINES)

    return f"""You are a research assistant for a corporate trainer in Malaysia.

His training lines are:
{training_lines}

His existing client sectors and real past/current clients are:
{sector_lines}

IMPORTANT CONTEXT ON HRD CORP LEVY: Malaysian companies with 10+ local employees
are legally required to register with HRD Corp (formerly HRDF) and pay a training
levy, which they can then claim back to fund staff training. This means almost
any mid-to-large company in the sectors above is already a registered, levy-paying
employer by default - that alone is NOT a strong signal, since it's just the law.
What DOES matter is evidence the company actively USES that levy budget rather
than letting it sit unclaimed - for example, job postings or course listings that
mention "HRDF claimable" or "HRD Corp claimable," mentions of an internal L&D or
training function, or news of recent staff training/upskilling programmes. Give a
noticeably higher score to leads showing this kind of active-training-culture
evidence, since they're both a better cultural fit and easier to approach ("I see
you're already investing in staff development...").

IMPORTANT CONTEXT ON COMPANY SIZE: he currently operates independently
(not through a training provider company), so he lacks the formal
vendor/procurement registration large enterprises typically require before
engaging a trainer directly. Small and mid-size companies generally don't
have that requirement, so they're his realistic near-term priority — large
enterprises are still worth surfacing (useful to know, may be worth
pursuing once he has that registration) but should be clearly flagged as
harder to close right now, not treated as equally actionable.

Below is a batch of Google Alert entries from today. Each may contain zero,
one, or several distinct company leads. Ignore irrelevant results, duplicate
mentions of the same event, and generic listicle articles.

For each genuine lead:
1. Identify the company name and which sector above it belongs to.
2. Write one sentence describing the company and what's happening ("brief").
3. Write one sentence on why this is timely ("signal") — the specific hiring
   post, announcement, or news detail suggesting a training need right now.
   If the source text shows active-training-culture evidence (HRDF/HRD Corp
   claimable language, an internal L&D function, a recent training programme),
   say so explicitly here.
4. Pick the single most relevant training line based on the signal.
5. Write a one-line "fitNote" referencing the matching sector's client list
   above, e.g. "Same sector as existing oil & gas clients - Petronas, Velesto,
   Deleum." Never invent anything new about the real client companies
   themselves - only state the sector match.
6. Set "levySignal" to one of exactly three values:
   - "confirmed" - the source text explicitly mentions HRDF/HRD Corp claimable
     training, levy, or PSMB
   - "likely" - no explicit mention, but context implies a mid/large private
     Malaysian employer (branch count, staff count, industry) that would fall
     under mandatory HRD Corp registration
   - "unclear" - not enough information, OR the organisation is a type
     generally exempt from mandatory registration (government body, statutory
     body, or an NGO with social/welfare activities)
7. Set "sizeTier" to one of exactly three values:
   - "SME" - context suggests a small or mid-size company (limited branch
     count, no multinational/conglomerate language, not one of the specific
     large named clients already listed above)
   - "Enterprise" - explicit large-scale signals (multinational, listed on
     Bursa Malaysia, thousands of employees, extensive branch/nationwide
     network, or the lead IS one of the large named clients above, e.g. an
     alert literally about Petronas or a major bank itself)
   - "Unknown" - not enough information to tell either way. Use this rather
     than guessing "SME" by default when the signal is genuinely absent.
8. When sizeTier is "Enterprise", set "accessNote" to a short explanation,
   e.g. "Large enterprise - likely requires formal vendor/panel registration
   before direct engagement is realistic." Leave "accessNote" as an empty
   string for "SME" and "Unknown".
9. Give a priority score 0-100 based on how strong and recent the signal is,
   scoring "confirmed" levySignal noticeably higher than "likely", and
   "likely" higher than "unclear", all else being equal. Do not adjust the
   score based on sizeTier - that's tracked separately.
10. Estimate a realistic training deal value range in RM if inferable from
    company size, otherwise leave blank.
11. Leave contactName, contactRole, phone, and email as empty strings unless
    they appeared explicitly in the source text. Never guess or invent them.
12. Include the source URL and a short source label.

Return ONLY a JSON array, no other text, no markdown fences. Each object
must have exactly these keys: company, industry, training, score, brief,
signal, fitNote, levySignal, sizeTier, accessNote, contactName, contactRole,
phone, email, sourceLabel, sourceUrl, dealValue, fullBrief.

Today's alert entries:
{alert_text}
"""


def enrich(alert_text):
    """Calls Gemini once and returns a parsed list of lead dicts."""
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Get a free key at "
            "https://aistudio.google.com/apikey and put it in a .env file."
        )

    payload = {
        "contents": [{"parts": [{"text": build_prompt(alert_text)}]}],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json",
        },
    }
    resp = requests.post(
        GEMINI_URL,
        params={"key": GEMINI_API_KEY},
        json=payload,
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    leads = json.loads(text)
    if not isinstance(leads, list):
        raise ValueError("Gemini did not return a JSON array as expected.")
    return leads


if __name__ == "__main__":
    sample_text = (
        "- TITLE: Bank hiring customer experience trainer\n"
        "  SUMMARY: Regional bank posts new L&D role\n"
        "  LINK: https://example.com/job/123"
    )
    print(json.dumps(enrich(sample_text), indent=2))
