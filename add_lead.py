"""
Add a lead you found yourself — LinkedIn, a conversation, a news article you
read personally, whatever. Goes through the exact same dedupe and storage
as the automated pipeline, so it shows up in Scout identically, just
labeled so it's clear it came from you.

Usage:
    python add_lead.py
"""
from config import SECTORS, TRAINING_LINES
from store import merge_new_leads


def ask(prompt, required=False, default=""):
    while True:
        val = input(f"{prompt}{' [' + default + ']' if default else ''}: ").strip()
        if not val:
            val = default
        if val or not required:
            return val
        print("  (required — please enter something)")


def ask_choice(prompt, options):
    print(f"\n{prompt}")
    for i, opt in enumerate(options, 1):
        print(f"  {i}. {opt}")
    while True:
        raw = input(f"Choose 1-{len(options)}: ").strip()
        if raw.isdigit() and 1 <= int(raw) <= len(options):
            return options[int(raw) - 1]
        print("  Please enter a valid number.")


def main():
    print("=== Add a lead manually ===\n")

    company = ask("Company name", required=True)
    industry = ask_choice("Which sector?", list(SECTORS.keys()))
    training = ask_choice("Which training line fits best?", TRAINING_LINES)

    size_tier = ask_choice(
        "Company size — is this realistically actionable right now?",
        ["SME", "Enterprise", "Unknown"],
    )
    access_note = ""
    if size_tier == "Enterprise":
        access_note = ask(
            "Access note",
            default="Large enterprise - likely requires formal vendor/panel "
                     "registration before direct engagement is realistic.",
        )

    brief = ask("One-line brief (what's happening at this company?)", required=True)
    signal = ask("Why now? (what made you think of them today?)", required=True)

    same_sector_clients = ", ".join(SECTORS[industry])
    default_fit_note = f"Same sector as existing {industry.lower()} clients - {same_sector_clients}"
    fit_note = ask("Fit note", default=default_fit_note)

    levy_signal = ask_choice(
        "Levy signal — do you know if they're actively using HRD Corp/HRDF funding?",
        ["confirmed", "likely", "unclear"],
    )

    print("\n-- Contact info (leave blank if you don't have it yet, that's fine) --")
    contact_name = ask("Contact name")
    contact_role = ask("Contact role")
    phone = ask("Phone")
    email = ask("Email")

    print("\n-- Source (how someone else could verify this) --")
    source_label = ask("Source label (e.g. 'LinkedIn post, today')", required=True)
    source_url = ask("Source URL", required=True)

    deal_value = ask("Estimated deal value (e.g. 'RM 8,000-12,000')")
    score_raw = ask("Priority score 0-100", default="70")
    try:
        score = max(0, min(100, int(score_raw)))
    except ValueError:
        score = 70

    full_brief = ask("Fuller description (optional, a sentence or two more)", default=brief)

    lead = {
        "company": company,
        "industry": industry,
        "training": training,
        "score": score,
        "brief": brief,
        "signal": signal,
        "fitNote": fit_note,
        "levySignal": levy_signal,
        "sizeTier": size_tier,
        "accessNote": access_note,
        "contactName": contact_name,
        "contactRole": contact_role,
        "phone": phone,
        "email": email,
        "sourceLabel": source_label,
        "sourceUrl": source_url,
        "dealValue": deal_value,
        "fullBrief": full_brief,
    }

    added, all_leads = merge_new_leads([lead], added_by="manual")

    if added:
        print(f"\nAdded: {company} (id {added[0]['id']}, priority tier: {added[0]['priorityTier']})")
        print(f"Total leads now stored: {len(all_leads)}")
    else:
        print(f"\n{company} looks like a duplicate of a lead already stored "
              f"(same company + source URL) — nothing added.")


if __name__ == "__main__":
    main()
