import os
import os, json
import argparse
from supabase import create_client
from google import genai
from dotenv import load_dotenv

# Model ID, overridable without a code change.
#
# gemini-2.5-flash was retired for new accounts mid-Oct 2026: moving to a
# fresh API key made every call 404 with "no longer available to new users".
# The ID now reads from the environment so the next retirement is a secret
# change, not a deploy. 3.5-flash was chosen over the newer 3.7/3.8 because
# those were returning 503 "high demand" on the free tier at the time.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

with open('vibedoc.md', 'r') as f:
    VIBE_MANIFESTO = f.read()

def get_weekly_exploration():
    parser = argparse.ArgumentParser(description="Curate events for a specific date window.")
    parser.add_argument("--start", help="Start date (YYYY-MM-DD)", required=True)
    parser.add_argument("--end", help="End date (YYYY-MM-DD)", required=True)
    args = parser.parse_args()
    
    start_date = args.start
    end_date = args.end

    print(f"🕵️‍♂️ Curating the 'Frequent Flyer' Menu for {start_date} to {end_date}...")

    # 1. Pull data including the flyer_url column
    res = supabase.table("events") \
        .select("event_name, event_date, flyer_url, metadata, venues(name, neighborhood, url)") \
        .gte("metadata->vibe_score", 7) \
        .gte("event_date", start_date) \
        .lte("event_date", end_date) \
        .execute()
        
    events = res.data

    if not events:
        print(f"❌ No suitable events found.")
        return

    # 2. Enhanced Prompt with your Category Emojis
    prompt = f"""
    {VIBE_MANIFESTO}

    ROLE: Senior Curator for Frequent Flyer.
    CATEGORIES: 🎶 Music, 🛍️ Markets & Flea Markets, 🍹 Food & Drink, 🧘 Wellness, 🎨 Art & Cultural, 🛠️ Workshops & Classes, 🌳 Community, 💛 Charity & Benefit, 🎉 Holiday & Seasonal, 🎥 Film Screenings & Movie Nights, 🌙 Nightlife, 🏃 Sports, 📚 Educational, 🧸 Kids & Family, 🏗️ Pop-Up, 🏮 Cultural Celebrations, 🎮 Gaming, 🤝 Networking, 🏞️ Outdoor Adventures, 📖 Book Clubs & Literary, 🎭 improv & comedy.

    TASK: Select the Top 30 events. Group them by Day of the Week.
    
    FOR EACH EVENT, OUTPUT THIS EXACT BLOCK:
    ---
    **[Day of Week]**
    Title: [Event Name]
    Description: [1-sentence summary]
    Location, Neighborhood: [Venue Name], [Neighborhood]
    Vibe: [Emoji] [Category Name]
    Vibe Rank: [Score/10]
    Flyer Image: [The 'flyer_url' field provided in data, or 'N/A' if None]
    Event Url: [The 'venues.url' field provided in data]
    ---

    DATA: {json.dumps(events)}
    """

    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    except Exception:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    
    filename = f'ff_production_menu_{start_date}.txt'
    with open(filename, 'w') as f:
        f.write(response.text)
    
    print(f"\n📝 PRODUCTION MENU READY: {filename}")

if __name__ == "__main__":
    get_weekly_exploration()