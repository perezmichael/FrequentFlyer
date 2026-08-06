/**
 * One place that knows where the site lives.
 *
 * Canonical URLs, the sitemap, robots.txt and every Open Graph image resolve
 * against this. It reads NEXT_PUBLIC_SITE_URL so the move off the Vercel
 * subdomain is an environment change rather than a code change — and so
 * previews don't advertise themselves to Google as the canonical site.
 */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL || 'https://frequentflyerla.com'
).replace(/\/$/, '');

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = '/'): string {
    return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Vercel sets VERCEL_ENV=preview for branch deploys. Previews must not be
 * indexed: duplicate content on a throwaway hostname competes with the real
 * site for the same queries.
 */
export const IS_INDEXABLE = process.env.VERCEL_ENV !== 'preview';

export const SITE_NAME = 'Frequent Flyer';
export const SITE_TAGLINE = 'What’s happening in Los Angeles';
