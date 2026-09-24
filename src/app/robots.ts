import type { MetadataRoute } from 'next';
import { SITE_URL, IS_INDEXABLE, absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
    // Branch previews serve the same pages on a throwaway hostname. Letting
    // them be crawled splits signals between hosts for identical content.
    if (!IS_INDEXABLE) {
        return { rules: [{ userAgent: '*', disallow: '/' }] };
    }

    return {
        rules: [
            {
                userAgent: '*',
                disallow: [
                    '/admin',      // password-gated; nothing to index
                    '/design',     // internal design-system reference
                    '/studio',
                    // NOTE: /events2 is deliberately NOT listed. It carries a
                    // noindex tag instead. Disallowing it here would stop the
                    // crawler fetching the page, and a noindex that is never
                    // fetched is never obeyed — which is how it ended up
                    // reported as a duplicate in Search Console.
                    // Internal API routes stay out. The public read API below
                    // is carved back in explicitly — a blanket '/api/' here
                    // would tell every well-behaved agent that the endpoint we
                    // are actively advertising is off limits.
                    '/api/click',
                    '/api/agent/',
                    '/ingest',     // the PostHog analytics proxy
                ],
                // Listed so the crawlers that read robots.txt as a capability
                // hint can find the machine-readable surface without being
                // told about it separately.
                allow: ['/', '/api/v1/', '/api/openapi.json'],
            },
        ],
        sitemap: absoluteUrl('/sitemap.xml'),
        host: SITE_URL,
    };
}
