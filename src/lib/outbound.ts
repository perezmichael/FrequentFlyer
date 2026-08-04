/**
 * Tag links that leave the site for a venue's own page.
 *
 * The point isn't our own measurement — it's that the venue sees
 * "frequentflyer" in *their* analytics, in their own dashboard. A referral
 * they can verify themselves is worth more than a number we report at them,
 * and it's the difference between "trust me" and "check your own numbers".
 *
 * This data can't be reconstructed later, so links are tagged from the start.
 */
const UTM = {
    utm_source: 'frequentflyer',
    utm_medium: 'referral',
} as const;

export function withReferral(url: string | null | undefined): string | undefined {
    if (!url) return undefined;

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        // Not an absolute URL — hand it back untouched rather than mangling it.
        return url;
    }

    // Only tag real web links. mailto:, tel: and friends get nothing.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return url;

    // Respect a link that already carries campaign tags: a venue's own
    // tracked ticket link shouldn't have its attribution overwritten.
    if (parsed.searchParams.has('utm_source')) return url;

    for (const [key, value] of Object.entries(UTM)) {
        parsed.searchParams.set(key, value);
    }
    return parsed.toString();
}
