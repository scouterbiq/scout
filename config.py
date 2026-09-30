"""
All the settings you'd actually want to change live here, in one place,
instead of scattered across scripts.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# --- API key ---
# Get a free key at https://aistudio.google.com/apikey — no card required.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

# --- Where the alerts come from ---
# These are Google News RSS search feeds — no account, no manual alert
# creation, no login. Google News generates a live feed straight from a
# search query. Works the moment this file is used, nothing to set up.
def _news_feed(query):
    import urllib.parse
    q = urllib.parse.quote(query)
    return f"https://news.google.com/rss/search?q={q}&hl=en-MY&gl=MY&ceid=MY:en"


ALERT_FEEDS = [
    _news_feed('"learning and development" OR "training manager" oil gas Malaysia'),
    _news_feed('"training tender" OR "training RFP" Petronas OR Deleum OR "oil and gas" Malaysia'),
    _news_feed('"sales training" OR "dealership training" automotive Malaysia'),
    _news_feed('"customer experience" OR "service training" bank Malaysia'),
    _news_feed('"trade marketing" hiring FMCG Malaysia'),
    _news_feed('manufacturing Malaysia "digitalisation" OR "AI adoption" staff'),
    _news_feed('healthcare Malaysia "patient experience" training'),
    _news_feed('"AI tools" workshop staff IT solutions Malaysia'),
    _news_feed('NGO Malaysia "capacity building" training grant'),
    _news_feed('education Malaysia "staff development" OR "professional development"'),
    _news_feed('"corporate training" Malaysia tender OR RFP'),
    _news_feed('"business writing workshop" OR "critical thinking training" Malaysia'),
    _news_feed('"HRDF claimable" OR "HRD Corp claimable" Malaysia training'),
    _news_feed('"appointed" OR "joins as" "Head of HR" OR "Head of L&D" OR "CHRO" Malaysia'),
    _news_feed('MDEC OR "SME Corp" "training grant" OR "upskilling" Malaysia SME'),
]

# --- Storage ---
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
LEADS_JSON = os.path.join(DATA_DIR, "leads.json")
LEADS_CSV = os.path.join(DATA_DIR, "leads.csv")

# --- Business context, fed into the enrichment prompt ---
SECTORS = {
    "Oil & Gas": ["Petronas", "Velesto", "Deleum"],
    "Automotive": ["Federal Auto", "Sime Motors", "Cycle & Carriage", "Mitsubishi", "Proton"],
    "FMCG": ["Lam Soon", "Tesco"],
    "Manufacturing": ["Siemens", "Nippon Paints", "Panasonic", "Infineon"],
    "Healthcare": ["KPJ Group", "Smith & Nephew"],
    "IT Solutions": ["NCR", "Hitachi Vantara"],
    "NGO": ["Mercy Malaysia"],
    "Education": ["Newcastle University", "Curtin University", "College UEM"],
    "Banks": ["Affin Bank", "Agrobank", "Bangkok Bank", "Bank Muamalat", "Al Rajhi"],
}

TRAINING_LINES = [
    "Communication Skills",
    "Professional Business Writing",
    "Critical Thinking and Problem Solving",
    "AI Tools for Workplace Productivity",
]

# The exact columns Scout's dashboard expects.
LEAD_FIELDS = [
    "id", "company", "industry", "score", "brief", "signal",
    "contactName", "contactRole", "phone", "email",
    "sourceLabel", "sourceUrl", "dealValue", "days", "fullBrief",
    "training", "fitNote", "levySignal",
    "sizeTier", "accessNote", "priorityTier", "addedBy",
]
