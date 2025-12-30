import os, json
import argparse
from supabase import create_client
from google import genai
from dotenv import load_dotenv

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
        .select("event_name, event_date, flyer_url, metadata, venues(name, neighborhood)") \
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
    [Day Name]
    [Score/10] [Event Name]
    SLIDE LABEL: [Emoji from list above] [Category Name]
    VENUE: [Venue Name] @ [Neighborhood]
    FLYER: [The 'flyer_url' field provided in data]
    RAW DESCRIPTION: [1-sentence summary of what's happening]
    IG CAPTION: [Punchy, lowercase draft]
    ---

    DATA: {json.dumps(events)}
    """

    try:
        response = client.models.generate_content(model="gemini-2.0-flash-exp", contents=prompt)
    except Exception:
        response = client.models.generate_content(model="gemini-1.5-pro", contents=prompt)
    
    filename = f'ff_production_menu_{start_date}.txt'
    with open(filename, 'w') as f:
        f.write(response.text)
    
    print(f"\n📝 PRODUCTION MENU READY: {filename}")

if __name__ == "__main__":
    get_weekly_exploration()