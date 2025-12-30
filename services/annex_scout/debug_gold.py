from playwright.sync_api import sync_playwright
import time

def debug_gold():
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

        print("🛰️  Visiting Gold-Diggers...")
        page.goto("https://gold-diggers.com/pages/drink", wait_until="domcontentloaded", timeout=60000)
        
        print("📜  Scrolling...")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(2)
        page.evaluate("window.scrollTo(0, 500)")
        
        print("⏳  Waiting for DICE widget...")
        try:
            # Wait for the widget class identified by browser agent
            page.wait_for_selector(".dice_event-title", timeout=15000)
            print("✅  DICE Widget FOUND!")
        except:
            print("❌  DICE Widget NOT found within timeout.")
        
        # Snapshots for debugging
        html = page.content()
        text = page.inner_text("body")
        print(f"📄  Content Length: {len(html)} chars")
        print(f"📄  Visible Text Length: {len(text)} chars")
        print(f"👀  Preview: {text[:500]}...")

        browser.close()

if __name__ == "__main__":
    debug_gold()
