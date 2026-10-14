import { OPTIMIZED_IMAGE_HOSTS } from './src/lib/imageHosts.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet v4 is incompatible with React StrictMode's dev-only double
  // mount: it re-runs MapContainer's init on a node that already has a Leaflet
  // instance, throwing "Map container is already initialized." Disabling Strict
  // Mode avoids this; production behavior is unchanged (it never double-invokes).
  reactStrictMode: false,

  /**
   * Proxy PostHog through our own origin.
   *
   * Content blockers filter requests to known analytics hosts outright. On a
   * site with real volume that's a rounding error; at a few dozen visitors a
   * week it could quietly remove a third of the sample and there'd be no way
   * to tell from the dashboard. Served from /ingest, the requests are
   * first-party and survive.
   */
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  // PostHog's endpoints are trailing-slash sensitive; without this Next would
  // redirect some of them and the events would be dropped.
  skipTrailingSlashRedirect: true,

  images: {
    // Derived from the same list SmartImage checks, so the two can't drift —
    // a host the component optimizes but the config doesn't know about would
    // throw on a live page. See src/lib/imageHosts.mjs.
    remotePatterns: OPTIMIZED_IMAGE_HOSTS.map(h => ({
      protocol: 'https',
      hostname: h.hostname,
      ...(h.pathname ? { pathname: h.pathname } : {}),
    })),

    /**
     * 31 days. Next 14 defaults this to SIXTY SECONDS, which is the single
     * most expensive line in the whole project.
     *
     * With a 60s TTL every optimized variant expires a minute after it's made,
     * so the next request re-fetches the original from Supabase and re-encodes
     * it from scratch. ~1,000 flyers at ~4 variants each should need about
     * 4,000 transformations ever; a fortnight of this produced 98,200 and 1.36M
     * cache writes — $10.51, about two thirds of the bill, nearly all of it the
     * same handful of images being rebuilt on a loop.
     *
     * A long TTL is safe ONLY because every flyer URL is now content-versioned.
     *
     * This comment used to read "flyers don't change", and that was wrong:
     * master_scout uploads to flyers/<event_id>.jpg with upsert, so a
     * re-scrape replaces the bytes under an unchanged URL. With a 31-day TTL
     * the optimizer kept serving the previous picture — and because the cache
     * key is (url, w, q), it went stale per variant: The Regent's site header
     * was still coming back at w=1200&q=90 (what the detail sheet asks for) a
     * day after the correct flyer replaced it, while the feed card at q=75
     * showed the new one. Same event, two different images on one page.
     *
     * upload_flyer now appends ?v=<sha256-16> to the public URL, so changed
     * bytes mean a changed URL and the TTL can stay long. Shared flyers were
     * always fine — they're content-addressed by path
     * (flyers/shared/<sha1-16>.<ext>).
     */
    minimumCacheTTL: 2_678_400,

    /**
     * Next's default ladder ends [..., 1920, 2048, 3840]. Measured against the
     * real DOM, nothing here asks for those: the picks strip renders at 200px,
     * a feed card at 381px, and the detail hero at 560px — so even at 3x DPR
     * the largest useful width is ~1200. The top two rungs were pure cost,
     * generated and stored for widths no visitor ever requested.
     *
     * 1920 stays as the ceiling for the full-bleed guide hero (sizes="100vw").
     *
     * Trimmed again Oct 2026 after Vercel warned at 75% of the free tier's
     * 300,000 image-optimization cache reads. 750 and 1080 are near-neighbours
     * of 828 and 1200 — dropping them sends those requests one rung up, for a
     * few KB more per image and a third fewer stored variants. The measured
     * CSS widths above (200 / 381 / 560px, so ~1120 at 2x) are still covered
     * exactly.
     *
     * Note this mainly reduces transformations and stored variants. Cache
     * *reads* track image requests, so they scale with traffic — a lot of
     * which is crawlers.
     */
    deviceSizes: [640, 828, 1200, 1920],

    /**
     * Serve stored bytes directly instead of through Vercel's optimizer.
     *
     * The free tier's image-optimization quota ran out on 2026-10-14, after a
     * three-week catch-up scrape added 150+ events and therefore 150+ new
     * source images. Every variant Vercel hadn't already cached started
     * returning 402 Payment Required — including the logo — so most of the
     * site's images broke at once.
     *
     * The alternatives were worse: Supabase's own resize endpoint is not
     * enabled on this plan (403 FeatureNotEnabled), and waiting for the quota
     * to reset leaves the site visibly broken for an unknown number of days.
     *
     * This is only safe because the stored files were rebuilt to suit it —
     * upcoming flyers above 250 KB were re-encoded to a 1400px long edge, which
     * took the heaviest from 11 MB to a couple of hundred KB. Serving the
     * originals as they were would have swapped a Vercel quota problem for a
     * Supabase egress one, and Supabase had just warned about quota too.
     *
     * To revert once the quota resets: delete this line. deviceSizes above is
     * kept for exactly that reason.
     */
    unoptimized: true,
  },
};

export default nextConfig;
