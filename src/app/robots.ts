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
                allow: '/',
                disallow: [
                    '/admin',      // password-gated; nothing to index
                    '/api/',
                    '/design',     // internal design-system reference
                    '/studio',
                    '/events2',    // static UI reference kept on purpose — would be duplicate content
                ],
            },
        ],
        sitemap: absoluteUrl('/sitemap.xml'),
        host: SITE_URL,
    };
}
