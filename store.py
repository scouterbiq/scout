"""
Stage 3: dedupe and persist. This is the piece that cost real money/credits
in the Make.com version (Data Store lookups). Done locally, it's free — it's
just reading a JSON file into memory and checking a set.
"""
import csv
import hashlib
import json
import os
from datetime import date
from config import DATA_DIR, LEADS_JSON, LEADS_CSV, LEAD_FIELDS


def _dedupe_key(lead):
    return f"{lead.get('company', '').strip().lower()}|{lead.get('sourceUrl', '').strip()}"


def _stable_id(lead):
    """
    A deterministic id derived from the dedupe key itself, not a running
    counter. Leads can now be added from more than one place (the automated
    pipeline, GitHub Actions runs, manual entry via add_lead.py) that don't
    always see the same version of the stored data at the same time — a
    counter-based id risks two different leads landing on the same id after
    a sync. A hash of the same key already used for dedupe can never
    collide unless the leads are, by definition, the same lead.
    """
    key = _dedupe_key(lead)
    return hashlib.md5(key.encode("utf-8")).hexdigest()[:10]


def _compute_priority_tier(lead):
    """Evidence-backed SME status is required; employer levy evidence is a bonus."""
    if lead.get("verificationStatus") == "excluded":
        return "unclassified"
    if str(lead.get("industry", "")).strip().lower() in ("banks", "banking", "ngo", "government"):
        return "unclassified"
    size = lead.get("sizeTier", "Unknown")
    if size == "Enterprise":
        return "enterprise"
    if size == "SME" and lead.get("sizeEvidence"):
        return "top"
    if size == "SME":
        return "good"
    return "unclassified"


def is_qualified(lead):
    """Evidence-backed SME only; HRD Corp participation is optional."""
    return _compute_priority_tier(lead) == "top"


def load_existing():
    if not os.path.exists(LEADS_JSON):
        return []
    with open(LEADS_JSON, "r") as f:
        return json.load(f)


def save_all(leads):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(LEADS_JSON, "w") as f:
        json.dump(leads, f, indent=2)
    with open(LEADS_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=LEAD_FIELDS)
        writer.writeheader()
        for lead in leads:
            writer.writerow({k: lead.get(k, "") for k in LEAD_FIELDS})


def merge_new_leads(new_leads, added_by="auto"):
    """
    Takes freshly enriched (or manually entered) leads, drops anything
    already stored (by company+sourceUrl), assigns a stable id, today's
    date, and a computed priorityTier, then returns the full updated list
    after saving it.

    added_by: "auto" for the pipeline, "manual" for hand-entered leads —
    purely informational.
    """
    existing = load_existing()
    seen = {_dedupe_key(l) for l in existing}

    added = []
    for lead in new_leads:
        key = _dedupe_key(lead)
        if key in seen:
            continue
        seen.add(key)
        lead["id"] = _stable_id(lead)
        lead["days"] = 0
        lead["_dateFound"] = str(date.today())
        lead["addedBy"] = added_by
        lead.setdefault("sizeTier", "Unknown")
        lead.setdefault("accessNote", "")
        lead["priorityTier"] = _compute_priority_tier(lead)
        added.append(lead)

    all_leads = existing + added
    for lead in all_leads:
        lead["priorityTier"] = _compute_priority_tier(lead)
        lead["qualificationStatus"] = (
            "SME evidence-backed — HRD Corp participation optional"
            if is_qualified(lead) else "Needs verification — not qualified"
        )
    save_all(all_leads)
    return added, all_leads


if __name__ == "__main__":
    print(f"Currently stored: {len(load_existing())} leads")
