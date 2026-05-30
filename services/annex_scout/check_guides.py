import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Path to .env file
# Root is /Users/michaelperez/Desktop/Code/FrequentFlyer
env_path = "/Users/michaelperez/Desktop/Code/FrequentFlyer/.env"

if not os.path.exists(env_path):
    print(f"❌ Error: .env file not found at {env_path}")
    # Try .env.local
    env_path = "/Users/michaelperez/Desktop/Code/FrequentFlyer/.env.local"
    if not os.path.exists(env_path):
        print(f"❌ Error: .env.local file not found at {env_path}")
        sys.exit(1)

print(f"Loading env from {env_path}")
load_dotenv(env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") # Try NEXT_PUBLIC_ prefix too
if not url:
    url = os.environ.get("SUPABASE_URL")

key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Try service role key first
if not key:
    key = os.environ.get("SUPABASE_SERVICE_KEY")
if not key:
    key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") # Fallback to anon key

if not url or not key:
    print(f"❌ Error: SUPABASE_URL or KEY not found in {env_path}")
    print(f"URL: {url}")
    print(f"Key found: {'Yes' if key else 'No'}")
    sys.exit(1)

try:
    supabase: Client = create_client(url, key)
except Exception as e:
    print(f"❌ Error creating Supabase client: {e}")
    sys.exit(1)

def check_guides():
    print("🔎 CHECKING GUIDES TABLE...\n")
    
    try:
        # Fetch all guides
        response = supabase.table("guides").select(
            "*, items:guide_items(count)"
        ).execute()
        
        guides = response.data
        
        if not guides:
            print("❌ No guides found in the database.")
            return

        print(f"First guide keys: {list(guides[0].keys())}")

        print(f"{'TITLE':<30} | {'SLUG':<20} | {'PUBLISHED':<10} | {'ITEMS':<5}")
        print("-" * 75)
        
        for guide in guides:
            title = guide.get('title', 'Unknown')[:30]
            slug = guide.get('slug', 'Unknown')[:20]
            published = str(guide.get('is_published', False))
            # items might be returned as [{'count': N}] or similar depending on query
            items = guide.get('items', [])
            count = len(items)
            if isinstance(items, list) and len(items) > 0 and 'count' in items[0]:
                 # if we used count aggregate, it might look different, but let's just see what we get
                 pass

            print(f"{title:<30} | {slug:<20} | {published:<10} | {count}")
            print(f"   Shape: {guide.get('cover_image', 'No Image')}")

    except Exception as e:
        print(f"⚠️ Error querying database: {e}")

if __name__ == "__main__":
    check_guides()
