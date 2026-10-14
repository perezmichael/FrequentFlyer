import os
import json
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from google import genai
from dotenv import load_dotenv
from datetime import datetime

# Model ID, overridable without a code change.
#
# gemini-2.5-flash was retired for new accounts mid-Oct 2026: moving to a
# fresh API key made every call 404 with "no longer available to new users".
# The ID now reads from the environment so the next retirement is a secret
# change, not a deploy. 3.5-flash was chosen over the newer 3.7/3.8 because
# those were returning 503 "high demand" on the free tier at the time.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

# 1. Load Environment & Setup Clients
load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def scout_benny_boy():
    print("🛰️  MODERN AGENT START: Scanning Benny Boy Brewing...")
    
    # 2. SCRAPE (Get the raw text first!)
    res = requests.get("https://bennyboybrewing.com/calendar")
    soup = BeautifulSoup(res.content, 'html.parser')
    
    # We grab the text here so 'raw_text' is defined before we prompt Gemini
    main_content = soup.find('main')
    raw_text = main_content.get_text(separator=' ', strip=True) if main_content else soup.get_text()

    # 3. THINK (Prepare the prompt with TODAY'S date)
    today = datetime.now().strftime("%A, %B %d, %Y")
    print(f"🧠  AGENT THINKING: Parsing with Gemini (Today is {today})...")
    
    prompt = f"""
    Act as a precise calendar extractor for the Annex platform.
    CURRENT DATE: {today}
    
    TASK: Extract events from the text into a JSON list. 
    RULES:
    1. Dates: Use the YYYY-MM-DD format. If the year is missing, assume it's 2025 (or 2026 if today is Dec and the event is Jan).
    2. Split: If an event covers a range (e.g. Dec 31 - Jan 1), create TWO separate JSON entries.
    3. Fallback: If no talent is found (e.g. 'Closed' or 'Sketch Party'), use 'Benny Boy Brewing' as the talent_name.
    4. Categorize: Choose from (Music, Pop-Up, Art, Community).

    TEXT TO ANALYZE:
    {raw_text[:8000]}

    RETURN ONLY A JSON LIST:
    [
      {{ "event_name": "", "date": "YYYY-MM-DD", "talent_name": "", "talent_ig": "@handle", "category": "" }}
    ]
    """
    
    # Call Gemini 2.5 Flash
    response = client.models.generate_content(
        model=GEMINI_MODEL, 
        contents=prompt
    )

    # Clean and load JSON
    try:
        clean_json = response.text.replace('```json', '').replace('```', '').strip()
        events = json.loads(clean_json)
    except Exception as e:
        print(f"❌ JSON Error: {e}")
        return

    # 4. ACT (Push to Supabase)
    # Ensure Venue exists
    venue_data = supabase.table("venues").upsert({
        "name": "Benny Boy Brewing",
        "neighborhood": "Lincoln Heights"
    }, on_conflict="name").execute()
    venue_id = venue_data.data[0]['id']

    for event in events:
        try:
            # Upsert Talent
            talent_data = supabase.table("talent").upsert({
                "name": event.get('talent_name', 'Benny Boy Brewing'),
                "instagram_handle": event.get('talent_ig', '')
            }, on_conflict="name").execute()
            talent_id = talent_data.data[0]['id']

            # Upsert Event
            supabase.table("events").upsert({
                "event_name": event['event_name'],
                "event_date": event['date'],
                "event_vibe": event['category'],
                "venue_id": venue_id,
                "talent_id": talent_id
            }, on_conflict="event_name, event_date, venue_id").execute()
            
            print(f"✅ LANDED: {event['event_name']} on {event['date']}")
        except Exception as e:
            print(f"⚠️  SKIPPED: {event.get('event_name')} - {e}")

if __name__ == "__main__":
    scout_benny_boy()