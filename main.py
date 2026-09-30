"""
Run the full pipeline: fetch alerts -> enrich with Gemini -> dedupe & store.

Usage:
    python main.py
"""
from fetch_alerts import fetch_all_alerts, format_for_prompt
from enrich import enrich
from store import merge_new_leads
from config import ALERT_FEEDS, LEADS_CSV


def run():
    if not ALERT_FEEDS:
        print("No feeds configured yet. Add your Google Alerts RSS URLs to "
              "config.py under ALERT_FEEDS, then run this again.")
        return

    print(f"Fetching {len(ALERT_FEEDS)} alert feeds...")
    entries = fetch_all_alerts()
    print(f"  -> {len(entries)} raw entries found")

    if not entries:
        print("Nothing new today. Done.")
        return

    print("Sending one batch to Gemini for enrichment...")
    alert_text = format_for_prompt(entries)
    leads = enrich(alert_text)
    print(f"  -> Gemini extracted {len(leads)} candidate leads")

    print("Deduping and saving...")
    added, all_leads = merge_new_leads(leads)
    print(f"  -> {len(added)} new leads added ({len(all_leads)} total stored)")
    print(f"\nSaved to: {LEADS_CSV}")


if __name__ == "__main__":
    run()
