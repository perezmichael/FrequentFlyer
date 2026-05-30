import os
import json
import time
from playwright.sync_api import sync_playwright
from supabase import create_client, Client
from google import genai
from dotenv import load_dotenv

# 1. Setup
load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Load the editorial manifesto
with open('vibedoc.md', 'r') as f:
    VIBE_MANIFESTO = f.read()

VALID_CATEGORIES = [
    "Happy Hour", "Trivia", "Karaoke", "Bingo", "Open Mic",
    "DJ Night", "Live Music", "Comedy Night", "Game Night",
    "Vinyl Night", "Industry Night", "Dance Night"
]

def run_recurring_scout():
    with open('venues.json') as f:
        venues = json.load(f)

    print(f"🔁 RECURRING SCOUT START — Scanning {len(venues)} venues for weekly programming")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )

        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            timezone_id="America/Los_Angeles"
        )
        page = context.new_page()

        for v in venues:
            print(f"\n🛰️  SCOUTING: {v['name']} ({v['neighborhood']})...")

            try:
                page.goto(v['url'], wait_until="domcontentloaded", timeout=60000)

                # Scroll to trigger lazy-loading
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(2)
                page.evaluate("window.scrollTo(0, 500)")

                try:
                    page.wait_for_selector(
                        ".dice-event, .dice_event-title, .event-list, #events, .event-card, .cl-view-month",
                        timeout=10000
                    )
                except:
                    time.sleep(5)

                raw_text = page.inner_text("body")
                print(f"   📄 Extracted {len(raw_text)} chars of text.")
            except Exception as e:
                print(f"⚠️  Browse failed for {v['name']}: {e}")
                continue

            # Ask Gemini specifically for recurring programming
            print(f"🧠  SCANNING for recurring events...")

            prompt = f"""
            {VIBE_MANIFESTO}

            TASK: Extract all RECURRING weekly or monthly programming from this venue's website.
            Look specifically for: happy hours, trivia nights, karaoke, bingo, open mic nights,
            DJ nights, live music residencies, comedy nights, game nights, vinyl nights,
            industry nights, dance nights, and any other regularly scheduled programming.

            VENUE: {v['name']}

            RULES:
            1. ONLY include events that happen on a regular schedule (weekly, biweekly, monthly).
            2. Do NOT include one-off events, special events, or concerts with specific dates.
            3. day_of_week uses: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.
            4. Use 24-hour time format for start_time and end_time (e.g. "19:00").
            5. category MUST be one of: {', '.join(VALID_CATEGORIES)}.
               Pick the closest match. If nothing fits, use the most relevant one.
            6. If no recurring events are found, return an empty list [].

            RETURN ONLY A JSON LIST:
            [
              {{
                "event_name": "Trivia Night",
                "category": "Trivia",
                "day_of_week": 2,
                "start_time": "19:00",
                "end_time": "21:00",
                "recurrence": "weekly",
                "description": "Weekly pub trivia with prizes"
              }}
            ]

            TEXT: {raw_text[:15000]}
            """

            try:
                response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
                events = json.loads(response.text.replace('```json', '').replace('```', '').strip())
                print(f"   🔮 Gemini found {len(events)} recurring events.")
            except Exception as e:
                print(f"❌ Gemini Error for {v['name']}: {e}")
                continue

            if not events:
                print(f"   ℹ️  No recurring events found for {v['name']}")
                continue

            # Upsert venue
            venue_id = supabase.table("venues").upsert({
                "name": v['name'], "neighborhood": v['neighborhood'], "url": v['url']
            }, on_conflict="name").execute().data[0]['id']

            for event in events:
                try:
                    # Validate category
                    category = event.get('category', '')
                    if category not in VALID_CATEGORIES:
                        print(f"   ⚠️  Unknown category '{category}', skipping.")
                        continue

                    supabase.table("recurring_events").upsert({
                        "event_name": event['event_name'],
                        "venue_id": venue_id,
                        "category": category,
                        "day_of_week": event['day_of_week'],
                        "start_time": event.get('start_time'),
                        "end_time": event.get('end_time'),
                        "recurrence": event.get('recurrence', 'weekly'),
                        "description": event.get('description', ''),
                    }, on_conflict="event_name, venue_id, day_of_week").execute()

                    day_names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                    day = day_names[event['day_of_week']]
                    print(f"   ✅ {event['event_name']} — {category} — Every {day}")
                except Exception as e:
                    print(f"   ⚠️  DB ERROR for {event.get('event_name', '?')}: {e}")
                    continue

            print("⏳ Cooldown: Waiting 10 seconds...")
            time.sleep(10)

        browser.close()

    print("\n🏁 RECURRING SCOUT COMPLETE")

if __name__ == "__main__":
    run_recurring_scout()
