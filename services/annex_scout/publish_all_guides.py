import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Path to .env file
env_path = "/Users/michaelperez/Desktop/Code/FrequentFlyer/.env.local"
if not os.path.exists(env_path):
    print(f"❌ Error: .env.local file not found at {env_path}")
    sys.exit(1)

load_dotenv(env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
if not url:
    url = os.environ.get("SUPABASE_URL")

key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not key:
    key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("❌ Error: SUPABASE_URL or KEY not found")
    sys.exit(1)

supabase: Client = create_client(url, key)

def publish_guides():
    print("🚀 PUBLISHING ALL GUIDES...\n")
    
    try:
        # Update all guides to be published
        response = supabase.table("guides").update({"is_published": True}).neq("id", "00000000-0000-0000-0000-000000000000").execute()
        
        # Check results
        print(f"✅ Updated guides. Rows affected: {len(response.data) if response.data else 0}")
        
    except Exception as e:
        print(f"⚠️ Error updating database: {e}")

if __name__ == "__main__":
    publish_guides()
