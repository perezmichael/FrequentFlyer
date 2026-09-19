/**
 * A small fixed-window rate limiter for the public API.
 *
 * Deliberately in-memory. The public read endpoints sit behind a CDN cache
 * (see `API_CACHE_HEADERS`), so in the normal case almost nothing reaches this
 * code at all — the limiter exists for the abnormal case: a looping agent or a
 * scraper walking every filter combination, which produces cache misses by
 * definition and would otherwise hit Supabase once per request.
 *
 * The honest caveat: serverless instances don't share memory, so the effective
 * ceiling is (limit × warm instances) rather than a hard global cap. That is
 * fine for what this defends against. A single runaway client keeps hitting the
 * same warm instance and gets throttled; a genuinely distributed flood would
 * need Redis, which is not worth a dependency and a second service until there
 * is traffic to justify it.
 */

type Window = { count: number; resetAt: number };

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;

// Bounded so a stream of unique IPs can't grow this without limit.
const MAX_TRACKED = 5_000;

const hits = new Map<string, Window>();

/**
 * The client IP as the platform reports it.
 *
 * Trusting `x-forwarded-for` from an arbitrary client would make the limiter
 * trivially bypassable, but on Vercel this header is set by the proxy in front
 * of the function, and the left-most entry is the real client. Falls back to a
 * shared bucket rather than failing open per-request.
 */
export function clientKey(req: Request): string {
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
    return req.headers.get('x-real-ip') || 'unknown';
}

export type RateLimitResult = {
    ok: boolean;
    limit: number;
    remaining: number;
    /** Unix seconds when the current window resets. */
    reset: number;
    /** Seconds until reset — for the Retry-After header on a 429. */
    retryAfter: number;
};

export function rateLimit(key: string): RateLimitResult {
    const now = Date.now();
    const existing = hits.get(key);

    if (!existing || now >= existing.resetAt) {
        // Opportunistic sweep: expired entries are cleared on write rather than
        // by a timer, which a serverless instance can't reliably hold.
        if (hits.size >= MAX_TRACKED) {
            for (const [k, w] of hits) if (now >= w.resetAt) hits.delete(k);
            // Still full of live windows — drop the whole map rather than grow.
            if (hits.size >= MAX_TRACKED) hits.clear();
        }
        const resetAt = now + WINDOW_MS;
        hits.set(key, { count: 1, resetAt });
        return {
            ok: true,
            limit: MAX_PER_WINDOW,
            remaining: MAX_PER_WINDOW - 1,
            reset: Math.ceil(resetAt / 1000),
            retryAfter: 0,
        };
    }

    existing.count += 1;
    const remaining = Math.max(0, MAX_PER_WINDOW - existing.count);
    return {
        ok: existing.count <= MAX_PER_WINDOW,
        limit: MAX_PER_WINDOW,
        remaining,
        reset: Math.ceil(existing.resetAt / 1000),
        retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
}

/** Standard rate-limit headers, returned on every response (not just 429s). */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
    return {
        'X-RateLimit-Limit': String(r.limit),
        'X-RateLimit-Remaining': String(r.remaining),
        'X-RateLimit-Reset': String(r.reset),
    };
}
