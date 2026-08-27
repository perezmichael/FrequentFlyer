/**
 * PostHog — product analytics, on top of the page-view counting Vercel already
 * does.
 *
 * Why both: Vercel Analytics answers "how many people arrived and from where",
 * which is genuinely all it claims to do. It cannot answer the question that
 * actually matters for a weekly events site — does anyone come BACK — because
 * it stores nothing to recognise a returning visitor by. Three quarters of a
 * recent week's traffic arrived with no referrer at all, which is either
 * loyal readers or bots, and there was no way to tell those apart.
 *
 * Everything here no-ops when NEXT_PUBLIC_POSTHOG_KEY is unset, so local dev
 * and previews stay silent and a missing key can never break a page.
 */
import posthog from 'posthog-js';

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/**
 * Ingest through our own origin rather than posthog.com directly — see the
 * rewrites in next.config.mjs. Content blockers filter requests to known
 * analytics domains, and at a few dozen visitors a week losing a third of them
 * to uBlock would matter far more than it does for a site with real volume.
 */
export const POSTHOG_PROXY = '/ingest';

/** Only used so links out of the SDK point at the right dashboard. */
export const POSTHOG_UI_HOST =
    process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || 'https://us.posthog.com';

export const analyticsEnabled = Boolean(POSTHOG_KEY);

/**
 * The custom events worth having. Kept as a union rather than free strings so
 * a typo becomes a build error instead of a second, near-identical event that
 * silently splits a funnel in half.
 */
export type AnalyticsEvent =
    /** The detail sheet opened. This is the depth signal Vercel cannot see:
     *  opening a listing on the home page is not a navigation, so it never
     *  registered as a page view and the feed looked far shallower than it is. */
    | 'event_opened'
    /** Someone left for a venue's own page — the closest thing to an outcome
     *  this product has. Already logged to Supabase; mirrored here so it can
     *  be used as a funnel step. */
    | 'outbound_click'
    /**
     * A filter or view was changed.
     *
     * Exists to settle one argument with evidence rather than taste: the feed
     * defaults to the next 30 days, but the product is called "What's
     * happening" and its stated job is knowing what's on THIS week. If people
     * routinely narrow to a day, the month default is costing them a tap and
     * the debate is over. If nobody ever touches these, the default IS the
     * product and changing it is the whole decision.
     *
     * Grouped under one event with a `filter` property rather than split into
     * several, so PostHog can break it down by type without needing a new
     * event name each time a filter is added. `filter: 'view'` covers the
     * mobile list/map toggle — worth knowing whether the map, which carries
     * half the interface, is opened at all on the 70% of sessions that are
     * phones.
     */
    | 'filter_used';

export function capture(event: AnalyticsEvent, props?: Record<string, unknown>): void {
    if (!analyticsEnabled || typeof window === 'undefined') return;
    try {
        posthog.capture(event, props);
    } catch {
        /* analytics must never break the page it is measuring */
    }
}
