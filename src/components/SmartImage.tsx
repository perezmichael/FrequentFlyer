'use client';

import NextImage from 'next/image';
import { canOptimize } from '@/lib/imageHosts.mjs';

/**
 * A flyer image that goes through Next's optimizer when it safely can, and
 * falls back to a plain lazy <img> when it can't.
 *
 * Why the fallback exists: next/image *throws* when handed a host that isn't in
 * `images.remotePatterns` — it doesn't degrade, it takes the page down. Our
 * images come from a scraper, so the host set is open-ended. Today the database
 * already holds dice-media.imgix.net, images.squarespace-cdn.com and
 * images.unsplash.com next to Supabase, and the next venue the importer reads
 * could introduce another without anyone touching the config.
 *
 * An unoptimized flyer costs a bit of egress. A thrown error costs the page.
 * So unknown hosts render as an ordinary lazy <img>, exactly as they did before
 * this component existed, and `imageHosts.mjs` is where a host graduates to
 * being optimized.
 *
 * Every call site wraps this in a sized, positioned container and wants
 * object-fit behaviour, so this always renders `fill` — and the fallback is
 * positioned to match, so the two paths lay out identically.
 */
type SmartImageProps = {
    src: string;
    alt: string;
    /** Kept for hover transitions and other per-call-site styling. */
    className?: string;
    /**
     * The image's *rendered* width at each breakpoint. This is what stops a
     * phone downloading a desktop-width file, so it's required rather than
     * optional — getting it wrong silently costs most of the benefit.
     */
    sizes: string;
    /**
     * Flyers are dense with small type — lineups, set times, addresses. The
     * default of 75 is fine at thumbnail size but visibly softens text on views
     * where the flyer is meant to be *read*, so those pass a higher value.
     */
    quality?: number;
    /** Skip lazy loading for an above-the-fold hero. */
    priority?: boolean;
    objectFit?: 'cover' | 'contain';
};

export default function SmartImage({
    src,
    alt,
    className,
    sizes,
    quality,
    priority = false,
    objectFit = 'cover',
}: SmartImageProps) {
    if (!canOptimize(src)) {
        return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
                src={src}
                alt={alt}
                className={className}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                // Mirrors what `fill` applies, so an unoptimized image sits in
                // the container exactly where an optimized one would.
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit }}
            />
        );
    }

    return (
        <NextImage
            src={src}
            alt={alt}
            fill
            className={className}
            sizes={sizes}
            quality={quality}
            priority={priority}
            style={{ objectFit }}
        />
    );
}
