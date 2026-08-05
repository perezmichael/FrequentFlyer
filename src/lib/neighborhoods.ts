/**
 * Neighborhood slugs — the bridge between a printed URL and a database string.
 *
 * Venues store a human name ("Echo Park", "West LA"). A flyer needs something
 * you can read off a poster and type: frequentflyerla.com/echo-park. These two
 * functions are the only place that mapping lives, so a route, the sitemap and
 * the feed can't disagree about what "west-la" means.
 *
 * Matching is done by comparing slugs, never by un-slugifying: "West LA"
 * round-trips to "West La", and a lookup that has to guess capitalisation will
 * eventually guess wrong.
 */

/** "Echo Park" → "echo-park". Stable, lowercase, URL-safe. */
export function neighborhoodSlug(name: string): string {
    return (name || '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Find the real neighborhood name behind a slug.
 *
 * Returns the canonical database string so everything downstream — the filter,
 * the heading, the metadata — uses the name the venues actually carry, rather
 * than a prettified guess derived from the URL.
 */
export function neighborhoodFromSlug(
    slug: string,
    known: readonly string[],
): string | null {
    const target = neighborhoodSlug(slug);
    return known.find(n => neighborhoodSlug(n) === target) ?? null;
}
