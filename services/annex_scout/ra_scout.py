"""
Resident Advisor Scout — Fetches LA events via RA's GraphQL API.

RA blocks web scrapers aggressively, but their internal GraphQL API
(used by their own frontend) is accessible with the right headers.
No API key needed.

Usage:
  cd services/annex_scout
  python3 ra_scout.py
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

with open('vibedoc.md', 'r') as f:
    VIBE_MANIFESTO = f.read()

RA_GRAPHQL_URL = "https://ra.co/graphql"
RA_HEADERS = {
    "Content-Type": "application/json",
    "Referer": "https://ra.co/events/us/losangeles",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
}

# LA area ID on RA (Los Angeles)
RA_LA_AREA_ID = 218

# LA neighborhoods for geo-matching
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
    "Boyle Heights": {"lat": 34.0334, "lng": -118.2107},
    "Cypress Park": {"lat": 34.0880, "lng": -118.2270},
    "Mid-City": {"lat": 34.0480, "lng": -118.3500},
    "Culver City": {"lat": 34.0211, "lng": -118.3965},
}


def guess_neighborhood(address_text, lat=None, lng=None):
    """Match an address or coordinates to the closest known LA neighborhood."""
    # Try keyword matching on address first
    if address_text:
        addr_lower = address_text.lower()
        keyword_map = {
            "downtown": "DTLA", "dtla": "DTLA", "arts district": "Arts District",
            "silver lake": "Silver Lake", "silverlake": "Silver Lake",
            "echo park": "Echo Park", "highland park": "Highland Park",
            "koreatown": "Koreatown", "k-town": "Koreatown",
            "hollywood": "Hollywood", "west hollywood": "West Hollywood",
            "weho": "West Hollywood", "venice": "Venice",
            "santa monica": "Santa Monica", "los feliz": "Los Feliz",
            "eagle rock": "Eagle Rock", "atwater": "Atwater Village",
            "glassell": "Glassell Park", "lincoln heights": "Lincoln Heights",
            "boyle heights": "Boyle Heights", "chinatown": "Chinatown",
            "culver city": "Culver City", "mid-city": "Mid-City",
            "east hollywood": "East Hollywood", "frogtown": "Frogtown",
        }
        for keyword, neighborhood in keyword_map.items():
            if keyword in addr_lower:
                coords = LA_NEIGHBORHOODS[neighborhood]
                return neighborhood, coords["lat"], coords["lng"]

    # Fall back to closest by lat/lng
    if lat and lng:
        best_name = "Los Angeles"
        best_dist = float("inf")
        for name, coords in LA_NEIGHBORHOODS.items():
            dist = ((lat - coords["lat"]) ** 2 + (lng - coords["lng"]) ** 2) ** 0.5
            if dist < best_dist:
                best_dist = dist
                best_name = name
        return best_name, lat, lng

    return "Los Angeles", 34.0522, -118.2437


def upload_flyer(image_url, event_id):
    """Download image and upload to Supabase storage."""
    try:
        resp = requests.get(image_url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        })
        if resp.status_code != 200 or len(resp.content) < 5000:
            return None

        path = f"flyers/{event_id}.jpg"
        supabase.storage.from_("event-flyers").upload(
            path, resp.content, {"content-type": "image/jpeg", "upsert": "true"}
        )
        return supabase.storage.from_("event-flyers").get_public_url(path)
    except Exception as e:
        print(f"   ⚠️ Flyer upload failed: {e}")
        return None


def fetch_ra_events(start_date, end_date, page_num=1):
    """
    Query RA's GraphQL API for events in the LA area.
    Returns list of event dicts or empty list.
    """
    # RA's internal GraphQL query for event listings
    query = """
    query GET_DEFAULT_EVENTS_LISTING(
        $indices: [IndexType!]
        $pageSize: Int
        $page: Int
        $aggregations: [ListingAggregationType!]
        $filters: [FilterInput]
    ) {
        listing(
            indices: $indices
            pageSize: $pageSize
            page: $page
            aggregations: $aggregations
            filters: $filters
        ) {
            data {
                ... on Event {
                    id
                    title
                    date
                    startTime
                    endTime
                    contentUrl
                    flyerFront
                    flyerBack
                    images {
                        filename
                        url
                    }
                    venue {
                        id
                        name
                        address
                        area {
                            name
                        }
                    }
                    artists {
                        name
                    }
                }
            }
            totalResults
        }
    }
    """

    variables = {
        "indices": ["EVENT"],
        "pageSize": 20,
        "page": page_num,
        "aggregations": [],
        "filters": [
            {"type": "AREA", "value": str(RA_LA_AREA_ID)},
            {"type": "DATERANGE", "value": json.dumps({
                "gte": start_date,
                "lte": end_date,
            })},
            {"type": "ENTITY_STATUS", "value": "LIVE"},
        ],
    }

    try:
        resp = requests.post(
            RA_GRAPHQL_URL,
            json={"query": query, "variables": variables},
            headers=RA_HEADERS,
            timeout=30,
        )

        if resp.status_code == 403:
            print("   ⚠️ RA returned 403 — GraphQL endpoint may be blocked too")
            print(f"   Response: {resp.text[:300]}")
            return [], 0

        if resp.status_code != 200:
            print(f"   ⚠️ RA API returned {resp.status_code}: {resp.text[:200]}")
            return [], 0

        data = resp.json()

        # Handle various response shapes
        listing = data.get("data", {}).get("listing", {})
        events = listing.get("data", [])
        total = listing.get("totalResults", 0)

        return events, total

    except Exception as e:
        print(f"   ⚠️ RA GraphQL request failed: {e}")
        return [], 0


def get_best_image_url(event):
    """Extract the best image URL from an RA event object."""
    # flyerFront is the primary event image on RA
    if event.get("flyerFront"):
        return event["flyerFront"]

    # flyerBack as secondary
    if event.get("flyerBack"):
        return event["flyerBack"]

    # images array
    images = event.get("images", [])
    if images:
        # Prefer larger images
        for img in images:
            url = img.get("url")
            if url:
                return url

    return None


def run_ra_scout():
    now = datetime.now()
    today = now.strftime("%A, %B %d, %Y")
    start_date = now.strftime("%Y-%m-%dT00:00:00.000Z")
    end_date = (now + timedelta(days=14)).strftime("%Y-%m-%dT23:59:59.000Z")

    print(f"🎧 RESIDENT ADVISOR SCOUT START")
    print(f"   Today: {today}")
    print(f"   Window: {now.strftime('%Y-%m-%d')} to {(now + timedelta(days=14)).strftime('%Y-%m-%d')}\n")

    # 1. Fetch events from RA GraphQL API (paginate)
    all_events = []
    page_num = 1
    while True:
        print(f"   📡 Fetching page {page_num}...")
        events, total = fetch_ra_events(start_date, end_date, page_num)

        if not events:
            if page_num == 1:
                print("   ❌ No events returned from RA GraphQL API.")
                print("   💡 The GraphQL endpoint may also be restricted.")
                print("   💡 Try again later or from a different network.")
            break

        all_events.extend(events)
        print(f"   Found {len(events)} events (total: {total})")

        if len(all_events) >= total or len(events) < 20:
            break

        page_num += 1
        time.sleep(1)

    if not all_events:
        return

    print(f"\n📊 Total RA events fetched: {len(all_events)}")

    # 2. Score with Gemini
    print(f"\n🧠 Scoring events with Gemini...")
    events_for_gemini = []
    for e in all_events:
        artists = [a.get("name", "") for a in (e.get("artists") or [])]
        venue = e.get("venue") or {}
        events_for_gemini.append({
            "title": e.get("title", ""),
            "artists": ", ".join(artists),
            "venue": venue.get("name", ""),
            "date": (e.get("date") or "")[:10],
        })

    # Batch score
    events_text = json.dumps(events_for_gemini[:40], indent=2)
    prompt = f"""
    {VIBE_MANIFESTO}

    TASK: Score these Resident Advisor / LA electronic music events using the Aesthetic Pillars.
    For each event, assign a vibe_score (1-10), a vibe/category tag, and a one-line justification.
    Only include events scoring 4 or above — RA events tend to be curated so be generous.

    RETURN ONLY A JSON LIST (use the exact title from input):
    [
      {{
        "title": "exact title",
        "vibe_score": 7,
        "category": "DJ Night",
        "vibe_justification": "..."
      }}
    ]

    EVENTS:
    {events_text[:12000]}
    """

    try:
        response = gemini.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        scored_list = json.loads(response.text.replace('```json', '').replace('```', '').strip())
        scores = {s["title"]: s for s in scored_list}
        print(f"   🔮 {len(scores)} events passed vibe filter")
    except Exception as e:
        print(f"   ❌ Gemini scoring error: {e}")
        # Fall back: include all events with default score
        scores = {e.get("title", ""): {"vibe_score": 5, "category": "Live Music", "vibe_justification": "RA curated"} for e in all_events}

    # 3. Save to Supabase
    print(f"\n💾 Saving events to Supabase...")
    saved = 0
    for ra_event in all_events:
        title = ra_event.get("title", "")
        if title not in scores:
            continue

        score_data = scores[title]
        venue_data = ra_event.get("venue") or {}
        venue_name = venue_data.get("name", "Unknown Venue")
        venue_address = venue_data.get("address", "")
        area_name = (venue_data.get("area") or {}).get("name", "")

        neighborhood, lat, lng = guess_neighborhood(
            f"{venue_address} {area_name}",
        )

        event_date = (ra_event.get("date") or "")[:10]
        ra_url = ra_event.get("contentUrl", "")
        if ra_url and not ra_url.startswith("http"):
            ra_url = f"https://ra.co{ra_url}"

        artists = [a.get("name", "") for a in (ra_event.get("artists") or [])]
        talent_name = ", ".join(artists) if artists else title

        try:
            # Upsert venue
            venue_id = supabase.table("venues").upsert({
                "name": venue_name,
                "neighborhood": neighborhood,
                "url": ra_url or f"https://ra.co/clubs/{venue_data.get('id', '')}",
                "lat": lat,
                "lng": lng,
            }, on_conflict="name").execute().data[0]["id"]

            # Upsert talent
            talent_id = supabase.table("talent").upsert({
                "name": talent_name or title,
                "instagram_handle": "",
            }, on_conflict="name").execute().data[0]["id"]

            # Upsert event
            event_row = supabase.table("events").upsert({
                "event_name": title,
                "event_date": event_date,
                "event_vibe": score_data.get("category", ""),
                "venue_id": venue_id,
                "talent_id": talent_id,
                "metadata": {
                    "vibe_score": score_data.get("vibe_score", 0),
                    "justification": score_data.get("vibe_justification", ""),
                    "source": "resident_advisor",
                    "ra_id": ra_event.get("id"),
                    "ra_url": ra_url,
                    "artists": artists,
                },
            }, on_conflict="event_name, event_date, venue_id").execute().data[0]

            event_id = event_row["id"]

            # Upload flyer image — RA typically has good flyer art
            image_url = get_best_image_url(ra_event)
            flyer_url = None
            if image_url:
                flyer_url = upload_flyer(image_url, event_id)

            if flyer_url:
                supabase.table("events").update({"flyer_url": flyer_url}).eq("id", event_id).execute()
                print(f"   ✅ {title} @ {venue_name} — {neighborhood} — {score_data.get('vibe_score')}/10 (+ flyer)")
            else:
                print(f"   ✅ {title} @ {venue_name} — {neighborhood} — {score_data.get('vibe_score')}/10")

            saved += 1
        except Exception as e:
            print(f"   ⚠️ DB error for '{title}': {e}")
            continue

    print(f"\n🏁 RA SCOUT COMPLETE — {saved} events saved")


if __name__ == "__main__":
    run_ra_scout()
