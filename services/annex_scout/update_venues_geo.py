import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. Setup
load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

def update_venues():
    print("🌍 Updating Venue Geolocations...")
    with open('venues.json') as f:
        venues = json.load(f)

    for v in venues:
        if 'lat' in v:
            print(f"   📍 {v['name']} -> {v['lat']}, {v['lng']}")
            try:
                # Update existing venues with lat/lng
                supabase.table("venues").upsert({
                    "name": v['name'],
                    "neighborhood": v['neighborhood'],
                    "lat": v['lat'],
                    "lng": v['lng']
                }, on_conflict="name").execute()
            except Exception as e:
                print(f"   ❌ Error updating {v['name']}: {e}")

if __name__ == "__main__":
    update_venues()
