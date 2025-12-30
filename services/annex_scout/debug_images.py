from playwright.sync_api import sync_playwright
import time
import requests
import os
from supabase import create_client
from dotenv import load_dotenv
from master_scout import process_flyer

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

def test_image_logic():
    print("🧪 TESTING IMAGE LOGIC...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
             user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
             viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()

        # TEST 1: Benny Boy (Squarespace, <img> tags)
        print("\n1. Testing Benny Boy Brewing...")
        page.goto("https://www.bennyboybrewing.com/events", wait_until="domcontentloaded")
        time.sleep(3)
        # Scroll to trigger lazy load
        page.evaluate("window.scrollTo(0, 500)")
        time.sleep(2)
        
        url_1 = process_flyer(page, "test-benny-boy-flyer")
        print(f"   👉 Result URL: {url_1}")

        # TEST 2: Revenge Of (CSS Background Image)
        print("\n2. Testing Revenge Of...")
        page.goto("https://revengeof.com/pages/events", wait_until="domcontentloaded")
        time.sleep(3)
        
        url_2 = process_flyer(page, "test-revenge-of-flyer")
        print(f"   👉 Result URL: {url_2}")

        browser.close()

if __name__ == "__main__":
    test_image_logic()
