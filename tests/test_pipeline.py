"""
Exercises the pipeline logic without hitting the real network — mocks the
feed fetch and the Gemini call, so we can verify dedupe/storage/priority
tier logic actually work correctly.
"""
import os
import sys
import shutil
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

TEST_DATA_DIR = os.path.join(os.path.dirname(__file__), "_test_data")


def setup_module(module):
    os.environ["GEMINI_API_KEY"] = "test-key-not-real"
    import config
    config.DATA_DIR = TEST_DATA_DIR
    config.LEADS_JSON = os.path.join(TEST_DATA_DIR, "leads.json")
    config.LEADS_CSV = os.path.join(TEST_DATA_DIR, "leads.csv")
    if os.path.exists(TEST_DATA_DIR):
        shutil.rmtree(TEST_DATA_DIR)


MOCK_ENTRIES = [
    {"title": "Bank hiring L&D trainer", "summary": "New role posted",
     "link": "https://example.com/job/1", "source_feed": "mock-feed-1"},
    {"title": "Oil & gas contractor writing directive", "summary": "New compliance memo",
     "link": "https://example.com/news/2", "source_feed": "mock-feed-2"},
]

MOCK_LEADS_ROUND_1 = [
    {
        # SME + confirmed levy -> should become "top"
        "company": "Test Packaging Co", "industry": "Manufacturing", "training": "Communication Skills",
        "score": 85, "brief": "Small regional bank branch expanding.", "signal": "Hiring L&D trainer, HRDF claimable course listed",
        "fitNote": "Same sector as existing bank clients - Affin Bank, Agrobank",
        "levySignal": "confirmed", "sizeTier": "SME", "accessNote": "",
        "sizeEvidence": "Independent employer with 25 employees",
        "levyEvidence": "Employer used its own HRD Corp levy for staff training",
        "contactName": "", "contactRole": "", "phone": "", "email": "",
        "sourceLabel": "Job listing", "sourceUrl": "https://example.com/job/1",
        "dealValue": "RM 8,000-12,000",
        "fullBrief": "Test bank expanding, needs communication training.",
    },
    {
        # Enterprise -> should become "enterprise" regardless of levy
        "company": "Test Oilco Sdn Bhd", "industry": "Oil & Gas",
        "training": "Professional Business Writing", "score": 90,
        "brief": "Large multinational oil contractor tightening reporting standards.",
        "signal": "New compliance memo mentions HRDF claimable workshop",
        "fitNote": "Same sector as Petronas, Velesto",
        "levySignal": "confirmed", "sizeTier": "Enterprise",
        "accessNote": "Large enterprise - likely requires formal vendor/panel registration before direct engagement is realistic.",
        "contactName": "", "contactRole": "", "phone": "", "email": "",
        "sourceLabel": "News", "sourceUrl": "https://example.com/news/2",
        "dealValue": "RM 15,000+",
        "fullBrief": "Oilco needs a business writing workshop.",
    },
]

MOCK_LEADS_ROUND_2 = [
    MOCK_LEADS_ROUND_1[0],  # exact duplicate -> should be skipped
    {
        "company": "Test Manufacturing Co", "industry": "Manufacturing",
        "training": "AI Tools for Workplace Productivity", "score": 60,
        "brief": "Small factory adopting AI reporting.", "signal": "New plant manager",
        "fitNote": "Same sector as Siemens, Panasonic",
        "levySignal": "unclear", "sizeTier": "SME", "accessNote": "",
        "contactName": "", "contactRole": "", "phone": "", "email": "",
        "sourceLabel": "Press release", "sourceUrl": "https://example.com/news/3",
        "dealValue": "RM 6,000-9,000",
        "fullBrief": "New leadership at a small manufacturer, digitalisation push.",
    },
    {
        "company": "Test Unclassified Corp", "industry": "IT Solutions",
        "training": "AI Tools for Workplace Productivity", "score": 55,
        "brief": "Company of unclear scale mentioned in passing.", "signal": "Brief mention only",
        "fitNote": "Same sector as NCR, Hitachi Vantara",
        "levySignal": "unclear", "sizeTier": "Unknown", "accessNote": "",
        "contactName": "", "contactRole": "", "phone": "", "email": "",
        "sourceLabel": "News", "sourceUrl": "https://example.com/news/4",
        "dealValue": "",
        "fullBrief": "Not enough context to size this company.",
    },
]


def test_full_pipeline_with_dedupe_and_priority_tiers():
    from fetch_alerts import format_for_prompt
    from store import merge_new_leads, load_existing, _stable_id

    with patch("fetch_alerts.fetch_all_alerts", return_value=MOCK_ENTRIES), \
         patch("enrich.enrich", return_value=MOCK_LEADS_ROUND_1):
        from fetch_alerts import fetch_all_alerts as fa
        from enrich import enrich as en
        entries = fa()
        assert len(entries) == 2

        prompt_text = format_for_prompt(entries)
        assert "Bank hiring L&D trainer" in prompt_text

        leads = en(prompt_text)
        added, all_leads = merge_new_leads(leads, added_by="auto")
        assert len(added) == 2
        assert len(all_leads) == 2

    import config
    assert os.path.exists(config.LEADS_JSON)
    assert os.path.exists(config.LEADS_CSV)

    with open(config.LEADS_CSV) as f:
        header = f.readline().strip().split(",")
        for col in ["company", "fitNote", "sourceUrl", "levySignal", "sizeTier", "accessNote", "priorityTier", "addedBy"]:
            assert col in header, f"{col} missing from CSV export"

    stored = {l["company"]: l for l in load_existing()}
    assert stored["Test Packaging Co"]["priorityTier"] == "top", \
        "SME + confirmed levy should be 'top' priority"
    assert stored["Test Oilco Sdn Bhd"]["priorityTier"] == "enterprise", \
        "Enterprise sizeTier should always be 'enterprise' tier regardless of levy signal"
    assert stored["Test Packaging Co"]["addedBy"] == "auto"

    with patch("enrich.enrich", return_value=MOCK_LEADS_ROUND_2):
        from enrich import enrich as en2
        leads2 = en2("irrelevant text for mock")
        added2, all_leads2 = merge_new_leads(leads2, added_by="auto")
        assert len(added2) == 2, f"expected 2 NEW leads (1 duplicate skipped), got {len(added2)}"
        assert len(all_leads2) == 4

    stored2 = {l["company"]: l for l in load_existing()}
    assert stored2["Test Manufacturing Co"]["priorityTier"] == "good", \
        "SME + unclear levy should be 'good', not 'top' or 'enterprise'"
    assert stored2["Test Unclassified Corp"]["priorityTier"] == "unclassified", \
        "Unknown sizeTier should be 'unclassified'"

    manual_lead = {
        "company": "Test Manual Find Sdn Bhd", "industry": "Education",
        "training": "Communication Skills", "score": 70,
        "brief": "Found manually on LinkedIn.", "signal": "Founder post about training needs",
        "fitNote": "Same sector as Newcastle University, Curtin University",
        "levySignal": "unclear", "sizeTier": "SME", "accessNote": "",
        "contactName": "", "contactRole": "", "phone": "", "email": "",
        "sourceLabel": "LinkedIn post", "sourceUrl": "https://example.com/linkedin/1",
        "dealValue": "", "fullBrief": "Manually sourced lead.",
    }
    added3, all_leads3 = merge_new_leads([manual_lead], added_by="manual")
    assert len(added3) == 1
    assert added3[0]["addedBy"] == "manual"
    assert added3[0]["priorityTier"] == "good"

    all_final = load_existing()
    ids = [l["id"] for l in all_final]
    assert len(ids) == len(set(ids)), "duplicate ids found across auto + manual leads!"
    assert _stable_id(manual_lead) == added3[0]["id"], "id should be deterministic from dedupe key"

    print("ALL ASSERTIONS PASSED")
    print(f"Final stored leads: {len(all_final)}")
    for l in all_final:
        print(f"  {l['company']} - tier: {l['priorityTier']} - addedBy: {l['addedBy']} - id: {l['id']}")


if __name__ == "__main__":
    setup_module(None)
    test_full_pipeline_with_dedupe_and_priority_tiers()
