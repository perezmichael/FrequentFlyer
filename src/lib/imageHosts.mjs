/**
 * The image hosts next/image is allowed to optimize.
 *
 * This is the single source of truth, imported by BOTH `next.config.mjs` (to
 * build `images.remotePatterns`) and `SmartImage` (to decide whether a given
 * URL can safely go through the optimizer). Keeping one list matters because
 * the two must not drift: a host the component optimizes but the config
 * doesn't know about is a thrown error on a live page.
 *
 * `.mjs` rather than `.ts` so `next.config.mjs` can import it directly —
 * the Next config is plain ESM and never goes through the TS pipeline.
 *
 * Adding a host is deliberate. Our flyers come from a scraper, so new domains
 * appear on their own; SmartImage falls back to an unoptimized <img> for
 * anything not listed here, which is the safe default. Promote a host to this
 * list once it's carrying enough images to be worth the egress.
 */
export const OPTIMIZED_IMAGE_HOSTS = [
    {
        // Where every flyer we host ourselves lives — 1051 of 1054 today.
        hostname: 'szjwuelaiawmqpbdubtp.supabase.co',
        pathname: '/storage/v1/object/public/**',
    },
    // The rest arrived with scraped events and venue records. Small counts, but
    // they're the reason the fallback exists at all.
    { hostname: 'dice-media.imgix.net' },
    { hostname: 'images.squarespace-cdn.com' },
    { hostname: 'images.unsplash.com' },
];

/**
 * Can this URL go through the image optimizer without throwing?
 *
 * Mirrors the subset of remotePatterns semantics we actually use: https only,
 * exact hostname, and the literal prefix of a `/**`-suffixed pathname.
 */
export function canOptimize(src) {
    if (!src) return false;
    // Local paths (/placeholder.jpg, guide covers) are served by Next itself
    // and are always safe.
    if (src.startsWith('/')) return true;

    let url;
    try {
        url = new URL(src);
    } catch {
        return false;
    }
    if (url.protocol !== 'https:') return false;

    return OPTIMIZED_IMAGE_HOSTS.some(h => {
        if (h.hostname !== url.hostname) return false;
        if (!h.pathname) return true;
        return url.pathname.startsWith(h.pathname.replace(/\*+$/, ''));
    });
}
