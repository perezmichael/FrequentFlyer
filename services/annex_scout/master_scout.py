import os
import json
import time
import requests
from io import BytesIO
from playwright.sync_api import sync_playwright
from supabase import create_client, Client
from google import genai
from dotenv import load_dotenv
from datetime import datetime

# 1. Setup
load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Load the "Soul Doc" (Manifesto)
with open('vibedoc.md', 'r') as f:
    VIBE_MANIFESTO = f.read()

# NEW: Upload function for your flyers
def process_flyer(page, event_id):
    try:
        flyer_url = None
        
        # Strategy A: Look for CSS background-images (Common in Squarespace/modern sites)
        # We look for large divs or elements that might be the hero image
        try:
            bg_element = page.evaluate("""() => {
                const nodes = Array.from(document.querySelectorAll('div, section, a, span'));
                for (const node of nodes) {
                    const style = window.getComputedStyle(node);
                    if (style.backgroundImage && style.backgroundImage.startsWith('url(')) {
                        const rect = node.getBoundingClientRect();
                        if (rect.width > 300 && rect.height > 200) {
                             return style.backgroundImage.slice(5, -2); // Remove url("...")
                        }
                    }
                }
                return null;
            }""")
            if bg_element:
                flyer_url = bg_element
        except:
            pass

        # Strategy B: Refined Image Selectors (if no BG image found)
        if not flyer_url:
            selectors = [
                ".eventlist-column-thumbnail img", # Squarespace specific
                "img[data-src]", # Lazy loaded images
                ".event-image img", 
                "img[src*='upload']", 
                "img[src*='images']",
                ".dice_event-image img"
            ]
            
            for sel in selectors:
                try:
                    el = page.query_selector(sel)
                    if el:
                        # Prefer data-src if available (higher res)
                        flyer_url = el.get_attribute("data-src")
                        if not flyer_url:
                            flyer_url = el.get_attribute("src")
                        
                        if flyer_url: break
                except:
                    continue
        
        # Fallback: First large-ish image
        if not flyer_url:
             flyer_url = page.evaluate("""() => {
                const imgs = Array.from(document.querySelectorAll('img'));
                for (const img of imgs) {
                    if (img.naturalWidth > 200) return img.src;
                }
                return null;
            }""")

        if flyer_url:
            # Clean up URL
            if flyer_url.startswith("//"):
                flyer_url = "https:" + flyer_url
            elif flyer_url.startswith("/"):
                flyer_url = f"{page.url.split('/')[0]}//{page.url.split('/')[2]}{flyer_url}"
            
            # Download and Upload
            try:
                # Use a timeout so we don't hang forever on an image
                img_data = requests.get(flyer_url, timeout=10).content
                path = f"flyers/{event_id}.jpg"
                
                # 'upsert' to overwrite if exists
                supabase.storage.from_("event-flyers").upload(path, img_data, {"content-type": "image/jpeg", "upsert": "true"})
                
                # Get public URL
                return supabase.storage.from_("event-flyers").get_public_url(path)
            except Exception as up_err:
                print(f"⚠️ Flyer upload failed: {up_err}")
                return None
    except Exception as e:
        print(f"⚠️ Flyer processing error: {e}")
    return None

def run_master_scout():
    with open('venues.json') as f:
        venues = json.load(f)

    today = datetime.now().strftime("%A, %B %d, %Y")
    print(f"🚀 MASTER SCOUT START (Today is {today})")

    with sync_playwright() as p:
        # Launch a "Headless" browser (no window pops up)
        # STEALTH MODE: Add args to hide the fact that we are a bot
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        # Define a "Real" User Agent and Viewport
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
                # 1. Go to URL
                page.goto(v['url'], wait_until="domcontentloaded", timeout=60000)
                
                # 1.5. SCROLL to trigger lazy-loading widgets (Critical for DICE/Gold-Diggers)
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(2)
                page.evaluate("window.scrollTo(0, 500)")

                # 2. Wait for common event markers (DICE, Ticketmaster, Squarespace, etc.)
                # We'll wait up to 10 seconds for ANY of these common selectors to appear
                try:
                    page.wait_for_selector(
                        ".dice-event, .dice_event-title, .event-list, #events, .event-card, .cl-view-month", 
                        timeout=10000
                    )
                except:
                    # If they don't appear, we just wait a few extra seconds as a fallback
                    print(f"⚠️  Timeout waiting for selector on {v['name']}, falling back to sleep...")
                    time.sleep(5) 
                
                # 3. Grab the visible text
                raw_text = page.inner_text("body")
                print(f"   📄 Extracted {len(raw_text)} chars of text.") 
            except Exception as e:
                print(f"⚠️  Browse failed for {v['name']}: {e}")
                continue

            # THINK (Using your vibedoc.md as the System Prompt)
            print(f"🧠  CURATING: Comparing against FF Manifesto...")
            
            prompt = f"""
            {VIBE_MANIFESTO}

            TASK: Extract EVERY event from the provided text into a JSON list. 
            CURRENT DATE: {today}
            VENUE: {v['name']}

            RULES:
            1. Use YYYY-MM-DD. Assume 2025/2026 logic.
            2. Split multi-day events into separate entries.
            3. SCORING: Use the Aesthetic Pillars in the Manifesto above to score 1-10.
            
            RETURN ONLY A JSON LIST:
            [
              {{ 
                "event_name": "", "date": "YYYY-MM-DD", "talent_name": "", 
                "talent_ig": "@handle", "category": "", "vibe_score": 0, "vibe_justification": "" 
              }}
            ]

            TEXT: {raw_text[:15000]} 
            """

            try:
                response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
                events = json.loads(response.text.replace('```json', '').replace('```', '').strip())
                print(f"   🔮 Gemini found {len(events)} events.")
            except Exception as e:
                print(f"❌ Gemini Error for {v['name']}: {e}")
                continue

            # ACT (Supabase)
            venue_id = supabase.table("venues").upsert({
                "name": v['name'], "neighborhood": v['neighborhood']
            }, on_conflict="name").execute().data[0]['id']

            for event in events:
                try:
                    # FIX: Ensure talent_name is never None
                    t_name = event.get('talent_name')
                    if not t_name or t_name == "None":
                        t_name = event['event_name']

                    talent_id = supabase.table("talent").upsert({
                        "name": t_name,
                        "instagram_handle": event.get('talent_ig', '')
                    }, on_conflict="name").execute().data[0]['id']

                    event_data = supabase.table("events").upsert({
                        "event_name": event['event_name'],
                        "event_date": event['date'],
                        "event_vibe": event['category'],
                        "venue_id": venue_id,
                        "talent_id": talent_id,
                        "metadata": {
                            "vibe_score": event.get('vibe_score', 0),
                            "justification": event.get('vibe_justification', '')
                        }
                    }, on_conflict="event_name, event_date, venue_id").execute().data[0]
                    
                    # NEW: Process Flyer 
                    event_id = event_data['id']
                    flyer_url = process_flyer(page, event_id)
                    if flyer_url:
                        # Update the event with the flyer URL
                        supabase.table("events").update({"flyer_url": flyer_url}).eq("id", event_id).execute()
                        print(f"✅ Saved Event + Flyer: {event['event_name']} ({event.get('vibe_score', 0)}/10)")
                    else:
                        print(f"✅ Saved Event (No Flyer): {event['event_name']} ({event.get('vibe_score', 0)}/10)")
                except Exception as e:
                    print(f"⚠️  DB ERROR for {event['event_name']}: {e}")
                    continue

            # FIX 2: Add a cooldown to avoid the 429 Error
            print("⏳ Cooldown: Waiting 10 seconds to respect API limits...")
            time.sleep(10)
        
        browser.close()

if __name__ == "__main__":
    run_master_scout()