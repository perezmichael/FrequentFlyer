"""
Eventbrite Scout — Fetches LA events from Eventbrite's API.

Eventbrite provides reliable structured data including high-quality images,
making it a great complement to the Playwright-based master_scout.

Setup:
  1. Create a free Eventbrite account at eventbrite.com
  2. Go to https://www.eventbrite.com/platform/api-keys
  3. Create an API key (private token)
  4. Add to .env: EVENTBRITE_TOKEN=your_token_here

Usage:
  python3 eventbrite_scout.py
"""

import os
import json
import time
import requests
from supabase import create_client, Client
from google import genai
from dotenv import load_dotenv
from datetime import datetime, timedelta

# ── Setup ──
load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
EVENTBRITE_TOKEN = os.getenv("EVENTBRITE_TOKEN")

with open('vibedoc.md', 'r') as f:
    VIBE_MANIFESTO = f.read()

# LA neighborhoods we care about — used to map venue addresses to neighborhoods
LA_NEIGHBORHOODS = {
    "Lincoln Heights": {"lat": 34.0747, "lng": -118.2158},
    "East Hollywood": {"lat": 34.0906, "lng": -118.3056},
    "Glassell Park": {"lat": 34.1164, "lng": -118.2361},
    "Koreatown": {"lat": 34.0610, "lng": -118.2831},
    "Silver Lake": {"lat": 34.1030, "lng": -118.2750},
    "Echo Park": {"lat": 34.0846, "lng": -118.2467},
    "Highland Park": {"lat": 34.1116, "lng": -118.1966},
    "DTLA": {"lat": 34.0407, "lng": -118.2468},
    "Los Feliz": {"lat": 34.1061, "lng": -118.2887},
    "Atwater Village": {"lat": 34.1172, "lng": -118.2626},
    "Eagle Rock": {"lat": 34.1392, "lng": -118.2145},
    "Frogtown": {"lat": 34.1010, "lng": -118.2380},
    "Chinatown": {"lat": 34.0620, "lng": -118.2380},
    "Arts District": {"lat": 34.0365, "lng": -118.2316},
    "Hollywood": {"lat": 34.0928, "lng": -118.3287},
    "West Hollywood": {"lat": 34.0900, "lng": -118.3617},
    "Venice": {"lat": 33.9850, "lng": -118.4695},
    "Santa Monica": {"lat": 34.0195, "lng": -118.4912},
}

# Eventbrite search location: central LA
SEARCH_LAT = 34.0522
SEARCH_LNG = -118.2437
SEARCH_RADIUS = "15mi"

# Eventbrite category IDs for relevant event types
# 103 = Music, 105 = Performing & Visual Arts, 110 = Food & Drink,
# 113 = Community & Culture, 199 = Other
CATEGORY_IDS = ["103", "105", "110", "113"]


def eventbrite_api(endpoint, params=None):
    """Make authenticated request to Eventbrite API v3."""
    headers = {"Authorization": f"Bearer {EVENTBRITE_TOKEN}"}
    url = f"https://www.eventbriteapi.com/v3/{endpoint}"
    resp = requests.get(url, headers=headers, params=params or {}, timeout=30)
    if resp.status_code == 401:
        print("❌ Eventbrite auth failed. Check your EVENTBRITE_TOKEN in .env")
        return None
    if resp.status_code == 429:
        print("⚠️ Eventbrite rate limit hit, waiting 60s...")
        time.sleep(60)
        resp = requests.get(url, headers=headers, params=params or {}, timeout=30)
    if resp.status_code != 200:
        print(f"⚠️ Eventbrite API error {resp.status_code}: {resp.text[:200]}")
        return None
    return resp.json()


def search_eventbrite_events():
    """Search for upcoming events near central LA."""
    now = datetime.now()
    week_end = now + timedelta(days=14)  # Look 2 weeks ahead

    all_events = []

    for cat_id in CATEGORY_IDS:
        print(f"\n🔍 Searching Eventbrite category {cat_id}...")
        params = {
            "location.latitude": SEARCH_LAT,
            "location.longitude": SEARCH_LNG,
            "location.within": SEARCH_RADIUS,
            "categories": cat_id,
            "start_date.range_start": now.strftime("%Y-%m-%dT%H:%M:%S"),
            "start_date.range_end": week_end.strftime("%Y-%m-%dT%H:%M:%S"),
            "sort_by": "date",
            "expand": "venue,logo",
        }

        data = eventbrite_api("events/search/", params)
        if not data:
            continue

        events = data.get("events", [])
        print(f"   Found {len(events)} events in category {cat_id}")
        all_events.extend(events)

        # Respect rate limits
        time.sleep(1)

    # Deduplicate by event ID
    seen = set()
    unique = []
    for e in all_events:
        if e["id"] not in seen:
            seen.add(e["id"])
            unique.append(e)

    print(f"\n📊 Total unique events: {len(unique)}")
    return unique


def guess_neighborhood(venue_data):
    """Match a venue's lat/lng to the closest known LA neighborhood."""
    if not venue_data:
        return "Unknown", SEARCH_LAT, SEARCH_LNG

    lat = float(venue_data.get("latitude", 0) or 0)
    lng = float(venue_data.get("longitude", 0) or 0)

    if lat == 0 or lng == 0:
        # Try address
        addr = venue_data.get("address", {})
        lat = float(addr.get("latitude", 0) or 0)
        lng = float(addr.get("longitude", 0) or 0)

    if lat == 0 or lng == 0:
        return "Unknown", SEARCH_LAT, SEARCH_LNG

    best_name = "Los Angeles"
    best_dist = float("inf")
    for name, coords in LA_NEIGHBORHOODS.items():
        dist = ((lat - coords["lat"]) ** 2 + (lng - coords["lng"]) ** 2) ** 0.5
        if dist < best_dist:
            best_dist = dist
            best_name = name

    return best_name, lat, lng


def upload_eventbrite_image(logo_data, event_id):
    """Download Eventbrite event logo/image and upload to Supabase."""
    if not logo_data:
        return None

    # Eventbrite provides multiple sizes — prefer original
    image_url = logo_data.get("original", {}).get("url") \
        or logo_data.get("url") \
        or logo_data.get("crop_mask", {}).get("original", {}).get("url")

    if not image_url:
        return None

    try:
        resp = requests.get(image_url, timeout=15)
        if resp.status_code != 200 or len(resp.content) < 5000:
            return None

        path = f"flyers/{event_id}.jpg"
        supabase.storage.from_("event-flyers").upload(
            path, resp.content, {"content-type": "image/jpeg", "upsert": "true"}
        )
        return supabase.storage.from_("event-flyers").get_public_url(path)
    except Exception as e:
        print(f"   ⚠️ Image upload failed: {e}")
        return None


def score_events_with_gemini(events_batch):
    """Use Gemini to score a batch of Eventbrite events against the FF manifesto."""
    events_text = json.dumps([{
        "name": e.get("name", {}).get("text", ""),
        "description": (e.get("description", {}).get("text", "") or "")[:500],
        "category": e.get("category", {}).get("name", ""),
        "venue": e.get("venue", {}).get("name", "") if e.get("venue") else "",
    } for e in events_batch], indent=2)

    prompt = f"""
    {VIBE_MANIFESTO}

    TASK: Score these events using the Aesthetic Pillars in the Manifesto above.
    For each event, assign a vibe_score (1-10), a vibe tag (category), and a one-line justification.
    Only include events that score 5 or above.

    RETURN ONLY A JSON LIST (use the exact event names from the input):
    [
      {{
        "event_name": "exact name from input",
        "vibe_score": 7,
        "category": "Live Music",
        "vibe_justification": "Underground jazz residency, strong Frequent Flyer energy"
      }}
    ]

    EVENTS:
    {events_text[:12000]}
    """

    try:
        response = gemini.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        scored = json.loads(response.text.replace('```json', '').replace('```', '').strip())
        return {s["event_name"]: s for s in scored}
    except Exception as e:
        print(f"❌ Gemini scoring error: {e}")
        return {}


def run_eventbrite_scout():
    if not EVENTBRITE_TOKEN:
        print("❌ EVENTBRITE_TOKEN not set in .env")
        print("   Get your API key at: https://www.eventbrite.com/platform/api-keys")
        print("   Then add to .env: EVENTBRITE_TOKEN=your_token_here")
        return

    print("🎫 EVENTBRITE SCOUT START")
    print(f"   Searching within {SEARCH_RADIUS} of central LA\n")

    # 1. Fetch events from Eventbrite
    eb_events = search_eventbrite_events()
    if not eb_events:
        print("No events found. Exiting.")
        return

    # 2. Score with Gemini in batches of 20
    print("\n🧠 Scoring events with Gemini...")
    scores = {}
    batch_size = 20
    for i in range(0, len(eb_events), batch_size):
        batch = eb_events[i:i + batch_size]
        batch_scores = score_events_with_gemini(batch)
        scores.update(batch_scores)
        print(f"   Scored batch {i // batch_size + 1}: {len(batch_scores)} events passed filter")
        time.sleep(2)  # Gemini rate limit cooldown

    print(f"\n✅ {len(scores)} events passed vibe filter")

    # 3. Save to Supabase
    saved = 0
    for eb_event in eb_events:
        event_name = eb_event.get("name", {}).get("text", "")
        if event_name not in scores:
            continue  # Didn't pass vibe filter

        score_data = scores[event_name]
        venue_data = eb_event.get("venue")
        venue_name = venue_data.get("name", "Unknown Venue") if venue_data else "Unknown Venue"
        neighborhood, lat, lng = guess_neighborhood(venue_data)

        # Parse date
        start = eb_event.get("start", {})
        event_date = start.get("local", "")[:10]  # YYYY-MM-DD

        try:
            # Upsert venue
            venue_url = venue_data.get("resource_uri", "") if venue_data else ""
            venue_id = supabase.table("venues").upsert({
                "name": venue_name,
                "neighborhood": neighborhood,
                "url": eb_event.get("url", venue_url),
                "lat": lat,
                "lng": lng,
            }, on_conflict="name").execute().data[0]["id"]

            # Upsert talent (use event name as talent for Eventbrite events)
            talent_id = supabase.table("talent").upsert({
                "name": event_name,
                "instagram_handle": "",
            }, on_conflict="name").execute().data[0]["id"]

            # Upsert event
            event_row = supabase.table("events").upsert({
                "event_name": event_name,
                "event_date": event_date,
                "event_vibe": score_data.get("category", ""),
                "venue_id": venue_id,
                "talent_id": talent_id,
                "metadata": {
                    "vibe_score": score_data.get("vibe_score", 0),
                    "justification": score_data.get("vibe_justification", ""),
                    "source": "eventbrite",
                    "eventbrite_id": eb_event["id"],
                    "eventbrite_url": eb_event.get("url", ""),
                },
            }, on_conflict="event_name, event_date, venue_id").execute().data[0]

            event_id = event_row["id"]

            # Upload image — Eventbrite has reliable logo/image data
            flyer_url = upload_eventbrite_image(eb_event.get("logo"), event_id)
            if flyer_url:
                supabase.table("events").update({"flyer_url": flyer_url}).eq("id", event_id).execute()
                print(f"   ✅ {event_name} — {neighborhood} — Score: {score_data.get('vibe_score')}/10 (+ flyer)")
            else:
                print(f"   ✅ {event_name} — {neighborhood} — Score: {score_data.get('vibe_score')}/10 (no image)")

            saved += 1

        except Exception as e:
            print(f"   ⚠️ DB error for '{event_name}': {e}")
            continue

    print(f"\n🏁 EVENTBRITE SCOUT COMPLETE — {saved} events saved")


if __name__ == "__main__":
    run_eventbrite_scout()
