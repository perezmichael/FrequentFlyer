import os
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. Setup
load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

def verify_counts():
    print("📊 VERIFYING DATABASE COUNTS...\n")
    
    try:
        # Fetch all events with their venue names
        # note: Supabase limit is 1000 by default, which should be enough for now.
        response = supabase.table("events").select(
            "venues(name)"
        ).execute()
        
        data = response.data
        total_events = len(data)
        
        counts = {}
        for row in data:
            venue_name = row.get('venues', {}).get('name', 'Unknown')
            counts[venue_name] = counts.get(venue_name, 0) + 1
            
        print(f"{'VENUE':<30} | {'COUNT':<10}")
        print("-" * 45)
        
        for venue, count in sorted(counts.items(), key=lambda x: x[1], reverse=True):
            print(f"{venue:<30} | {count:<10}")
            
        print("-" * 45)
        print(f"{'TOTAL EVENTS':<30} | {total_events:<10}")

    except Exception as e:
        print(f"⚠️ Error querying database: {e}")

if __name__ == "__main__":
    verify_counts()
