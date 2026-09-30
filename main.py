"""Bounded source screening; uncertain employers remain outside the shortlist."""
import json
import os
from datetime import date, timedelta
from fetch_alerts import fetch_all_alerts, format_for_prompt
from enrich import enrich, validate_evidence
from store import merge_new_leads, load_existing, is_qualified
from config import DATA_DIR


def run():
    entries = fetch_all_alerts()
    unique = {e["link"]: e for e in entries if e.get("link")}
    existing = load_existing()
    seen = {l.get("sourceUrl") for l in existing}
    pending = [e for key, e in unique.items() if key not in seen][:100]
    print(f"Raw articles: {len(entries)}; distinct articles: {len(unique)}; screening: {len(pending)}")
    candidates = []
    errors = []
    for start in range(0, len(pending), 25):
        batch = pending[start:start + 25]
        try:
            candidates.extend(validate_evidence(enrich(format_for_prompt(batch)), batch))
        except Exception as error:
            errors.append(str(error))
            print(f"SCREENING FAILED: {error}")
            break
    added, all_leads = merge_new_leads(candidates)
    qualified = [l for l in all_leads if is_qualified(l)]
    week_start = str(date.today() - timedelta(days=6))
    weekly = {l["company"].strip().casefold() for l in all_leads if l.get("_dateFound", "") >= week_start}
    report = {"date": str(date.today()), "rawArticles": len(entries), "uniqueArticles": len(unique),
              "newEmployerRecords": len(added), "uniqueEmployerNamesLast7Days": len(weekly),
              "publicEvidenceShortlist": len(qualified), "screeningErrors": errors,
              "note": "Discovery is not qualification. Current levy balance and claim delivery route require confirmation."}
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, "scan-report.json"), "w") as f:
        json.dump(report, f, indent=2)
    print(json.dumps(report, indent=2))
    if errors:
        raise RuntimeError("Screening incomplete; see scan-report.json. No failure is labelled successful.")


if __name__ == "__main__":
    run()
