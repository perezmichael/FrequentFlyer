import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

/**
 * Site footer — mainly a home for the legal and developer links.
 *
 * Deliberately plain. Its job is that /privacy, /terms and /docs are reachable
 * from the site rather than only from a sitemap, which is what a reviewer (or a
 * crawler) looks for.
 */
export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-cream border-t border-black/5 mt-24">
            <div className="page-container py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <p className="font-space-mono uppercase text-[11px] tracking-[-0.44px] text-black/40">
                    {SITE_NAME} — Los Angeles · © {year}
                </p>
                {/* Inline gaps on purpose: `gap-x-*` / `gap-y-*` don't generate in
                    this Tailwind v4 setup (they compute to `normal`), which ran
                    every link together. Plain `gap-*` works, but the row wants
                    asymmetric spacing. Same family as the z-[...] note in CLAUDE.md. */}
                <nav
                    className="flex flex-wrap"
                    style={{ columnGap: '24px', rowGap: '8px' }}
                >
                    {[
                        ['/guides', 'Guides'],
                        ['/agents', 'For agents'],
                        ['/docs', 'API'],
                        ['/privacy', 'Privacy'],
                        ['/terms', 'Terms'],
                    ].map(([href, text]) => (
                        <Link
                            key={href}
                            href={href}
                            className="font-space-mono uppercase text-[11px] tracking-[-0.44px] text-black/55 hover:text-brand transition-colors duration-150"
                        >
                            {text}
                        </Link>
                    ))}
                </nav>
            </div>
        </footer>
    );
}
