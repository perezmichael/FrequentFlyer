"""
check_venues.py — Pre-flight health check for venues.json.

Pings every venue URL and reports which ones are dead, unreachable, or
returning suspiciously empty content. Run this before a full scraper run to
avoid wasting 10-second cooldowns on broken venues.

Usage:
  cd services/annex_scout
  python3 check_venues.py

Flags to fix entries inline:
  python3 check_venues.py --write-bad venues_bad.json   # write bad list
  python3 check_venues.py --prune                       # remove bad venues from venues.json

By default, nothing is modified — it's report-only.
"""

import json
import sys
import time
import argparse
import concurrent.futures
import requests
from urllib.parse import urlparse

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Status codes we consider successful (some CDNs return 403 to bot UAs but the
# site is still live for Playwright). Treat 403 as a warning, not a failure.
OK_STATUSES = {200, 201, 301, 302, 303, 307, 308}
WARN_STATUSES = {403, 429, 503}


def classify(reason: str) -> str:
    """Bucket error strings into short labels for the report."""
    r = reason.lower()
    if "nameresolution" in r or "name or service not known" in r or "err_name_not_resolved" in r:
        return "DNS"
    if "ssl" in r or "certificate" in r or "cipher" in r:
        return "SSL"
    if "timed out" in r or "timeout" in r:
        return "TIMEOUT"
    if "connection" in r or "refused" in r:
        return "CONN"
    return "OTHER"


def check_venue(venue: dict) -> dict:
    """Check a single venue URL. Returns a result dict."""
    url = venue["url"]
    name = venue["name"]

    result = {
        "name": name,
        "url": url,
        "neighborhood": venue.get("neighborhood", ""),
        "ok": False,
        "status": None,
        "detail": "",
        "bytes": 0,
        "final_url": url,
    }

    try:
        # HEAD first (cheap). If HEAD is refused, fall back to GET.
        try:
            head = requests.head(url, headers=HEADERS, timeout=12, allow_redirects=True)
            status = head.status_code
            result["final_url"] = head.url
        except Exception:
            status = None

        # GET to confirm body is non-empty
        resp = requests.get(url, headers=HEADERS, timeout=20, allow_redirects=True)
        status = resp.status_code
        result["status"] = status
        result["final_url"] = resp.url
        result["bytes"] = len(resp.content)

        if status in OK_STATUSES:
            if len(resp.text.strip()) < 500:
                result["ok"] = False
                result["detail"] = f"Empty body ({len(resp.text)} chars)"
            else:
                result["ok"] = True
                result["detail"] = f"OK {status} · {len(resp.content) // 1024}kb"
        elif status in WARN_STATUSES:
            # Might still work in Playwright with different UA / cookies
            result["ok"] = True
            result["detail"] = f"WARN {status} (may work in Playwright)"
        else:
            result["ok"] = False
            result["detail"] = f"HTTP {status}"

    except requests.exceptions.SSLError as e:
        result["detail"] = f"SSL: {str(e)[:80]}"
        result["status"] = classify(str(e))
    except requests.exceptions.ConnectionError as e:
        result["detail"] = f"CONN: {str(e)[:80]}"
        result["status"] = classify(str(e))
    except requests.exceptions.Timeout as e:
        result["detail"] = f"TIMEOUT: {str(e)[:60]}"
        result["status"] = "TIMEOUT"
    except Exception as e:
        result["detail"] = f"ERR: {str(e)[:80]}"
        result["status"] = "OTHER"

    return result


def main():
    parser = argparse.ArgumentParser(description="Verify venues.json URLs.")
    parser.add_argument(
        "--write-bad",
        metavar="PATH",
        help="Write bad venues to this JSON file",
    )
    parser.add_argument(
        "--prune",
        action="store_true",
        help="Remove bad venues from venues.json (creates .bak backup)",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=8,
        help="How many URLs to check in parallel (default 8)",
    )
    parser.add_argument(
        "--venues",
        default="venues.json",
        help="Path to venues.json (default: venues.json)",
    )
    args = parser.parse_args()

    try:
        with open(args.venues) as f:
            venues = json.load(f)
    except FileNotFoundError:
        print(f"❌ Could not find {args.venues}")
        sys.exit(1)

    print(f"🔎 Checking {len(venues)} venues (concurrency={args.concurrency})...\n")

    results = []
    start = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        future_map = {pool.submit(check_venue, v): v for v in venues}
        for future in concurrent.futures.as_completed(future_map):
            r = future.result()
            symbol = "✅" if r["ok"] else "❌"
            print(f"{symbol} {r['name']:<32} {r['detail']}")
            results.append(r)

    # Preserve venues.json ordering for output
    by_name = {r["name"]: r for r in results}
    results = [by_name[v["name"]] for v in venues]

    elapsed = time.time() - start
    ok_count = sum(1 for r in results if r["ok"])
    bad = [r for r in results if not r["ok"]]

    print(f"\n{'─' * 60}")
    print(f"📊 {ok_count}/{len(results)} healthy  ·  {len(bad)} bad  ·  {elapsed:.1f}s")

    if bad:
        print(f"\n❌ Bad venues ({len(bad)}):")
        for b in bad:
            print(f"   • {b['name']:<32} {b['detail']}")

        # Group by error type for quick triage
        buckets: dict[str, list[str]] = {}
        for b in bad:
            key = str(b["status"] or "OTHER")
            buckets.setdefault(key, []).append(b["name"])
        print(f"\n📁 Grouped by error type:")
        for key, names in buckets.items():
            print(f"   {key}: {', '.join(names)}")

    # Write bad list
    if args.write_bad:
        with open(args.write_bad, "w") as f:
            json.dump(bad, f, indent=2)
        print(f"\n📝 Wrote bad list → {args.write_bad}")

    # Prune venues.json
    if args.prune and bad:
        backup = f"{args.venues}.bak"
        with open(backup, "w") as f:
            json.dump(venues, f, indent=2)
        good_venues = [v for v in venues if by_name[v["name"]]["ok"]]
        with open(args.venues, "w") as f:
            json.dump(good_venues, f, indent=2)
        print(f"\n✂️  Pruned {len(bad)} bad venues. Backup → {backup}")

    # Exit non-zero if any failures, so this can be wired into CI / pre-scrape hooks.
    sys.exit(0 if not bad else 1)


if __name__ == "__main__":
    main()
