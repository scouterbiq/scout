"""
Stage 1: pull today's entries from each Google Alerts RSS feed.

Google Alerts, set to RSS delivery instead of email, gives you a plain feed
URL you can fetch with no auth at all. This replaces the Gmail-reading step
from the earlier plan entirely.
"""
import feedparser
from config import ALERT_FEEDS


def fetch_all_alerts():
    """
    Returns a flat list of dicts: {title, summary, link, source_feed}
    across every configured feed. Feeds that fail to load are skipped with
    a warning, not a crash — one dead feed shouldn't kill the whole run.
    """
    entries = []
    for feed_url in ALERT_FEEDS:
        try:
            parsed = feedparser.parse(feed_url)
            if parsed.bozo and not parsed.entries:
                print(f"  ! Could not read feed, skipping: {feed_url}")
                continue
            for e in parsed.entries:
                entries.append({
                    "title": getattr(e, "title", ""),
                    "summary": getattr(e, "summary", ""),
                    "link": getattr(e, "link", ""),
                    "source_feed": feed_url,
                })
        except Exception as err:
            print(f"  ! Error fetching {feed_url}: {err}")
    return entries


def format_for_prompt(entries):
    """Turns the raw entries into one readable text block for the LLM call."""
    if not entries:
        return "(no alert entries today)"
    lines = []
    for e in entries:
        lines.append(f"- TITLE: {e['title']}\n  SUMMARY: {e['summary']}\n  LINK: {e['link']}")
    return "\n".join(lines)


if __name__ == "__main__":
    results = fetch_all_alerts()
    print(f"Fetched {len(results)} alert entries across {len(ALERT_FEEDS)} feeds.")
    print(format_for_prompt(results[:5]))
