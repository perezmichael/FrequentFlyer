import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getEventById } from '@/lib/queries';
import { formatEventDateTime } from '@/features/frequent-flyer/data/events';
import { absoluteUrl } from '@/lib/site';
import { withReferral } from '@/lib/outbound';
import { hasRealImage } from '@/features/frequent-flyer/data/vibePlaceholders';
import GeneratedFlyer from '@/features/frequent-flyer/components/GeneratedFlyer';
import ShareButton from '@/features/frequent-flyer/components/ShareButton';
import styles from './page.module.css';

// Fetch live so a freshly-approved event is shareable immediately.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const event = await getEventById(params.id);
    if (!event) return { title: 'Event not found' };

    const when = formatEventDateTime(event.date, event.startTime, event.endTime);
    const description = `${event.location} · ${when}`;
    // The flyer becomes the link-preview image when texted/posted — the whole
    // point of a shareable page. Fall back to no image for flyerless events.
    const images = hasRealImage(event.image) ? [event.image] : [];

    return {
        // No " · Frequent Flyer" suffix here — the root layout's title
        // template appends it, and doing both produced "Chess · Frequent
        // Flyer · Frequent Flyer".
        title: event.title,
        description,
        // Without this the page inherits the root canonical and declares
        // itself a duplicate of the homepage, de-indexing every listing.
        alternates: { canonical: `/event/${params.id}` },
        openGraph: {
            url: `/event/${params.id}`,
            title: event.title,
            description,
            images,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: event.title,
            description,
            images,
        },
    };
}

export default async function EventPage({ params }: { params: { id: string } }) {
    const event = await getEventById(params.id);
    if (!event) notFound();

    const showImage = hasRealImage(event.image);
    const when = formatEventDateTime(event.date, event.startTime, event.endTime);
    const hasDescription = event.description && event.description !== 'No description available';

    /**
     * schema.org Event, which is what makes a listing eligible for Google's
     * event rich results. Every field is omitted rather than guessed when we
     * don't hold it — a wrong startTime or a fabricated price in structured
     * data is worse than none, both for the reader and for the venue.
     */
    const jsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        // Date-only when the venue never published a start time.
        startDate: event.startTime ? `${event.date}T${event.startTime}` : event.date,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        url: absoluteUrl(`/event/${event.id}`),
        location: {
            '@type': 'Place',
            name: event.location,
            address: {
                '@type': 'PostalAddress',
                addressLocality: event.neighborhood || 'Los Angeles',
                addressRegion: 'CA',
                addressCountry: 'US',
            },
            // Omitted for un-geocoded venues rather than defaulted to a city
            // centroid — a wrong pin in structured data is a wrong pin in Google.
            ...(Number.isFinite(event.lat) && Number.isFinite(event.lng)
                ? { geo: { '@type': 'GeoCoordinates', latitude: event.lat, longitude: event.lng } }
                : {}),
        },
    };
    if (event.endTime) jsonLd.endDate = `${event.date}T${event.endTime}`;
    if (showImage) jsonLd.image = [event.image];
    if (hasDescription) jsonLd.description = event.description;

    return (
        <main className="min-h-screen bg-cream pt-[100px]">
            <script
                type="application/ld+json"
                // Next injects this verbatim; the payload is our own DB content,
                // serialised with JSON.stringify.
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="max-w-[560px] mx-auto pb-20">
                {/* Hero flyer — full-bleed & tall on mobile, framed card on larger screens */}
                <div className="relative w-full aspect-[4/5] sm:aspect-[4/3] sm:mt-6 sm:rounded-2xl overflow-hidden bg-ink sm:border sm:border-black/40">
                    {showImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                        <GeneratedFlyer title={event.title} vibe={event.vibe?.[0]} neighborhood={event.neighborhood} />
                    )}
                </div>

                <div className="px-5 pt-5">
                    {/* A shared link to a pick should say so — that's the whole
                        reason the link is worth sending. */}
                    {(event.vibe?.length || event.curationLevel === 'ff_curated') && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {event.curationLevel === 'ff_curated' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-brand text-brand font-space-mono text-[11px] font-bold uppercase tracking-[-0.44px] whitespace-nowrap">
                                    ★ FF Pick
                                </span>
                            )}
                            {event.vibe?.map((v) => (
                                <span key={v} className="stamp text-[11px]">{v}</span>
                            ))}
                        </div>
                    )}

                    <h1 className="font-space-grotesk text-[28px] leading-[1.05] font-bold text-ink tracking-[-0.5px] mb-4">
                        {event.title}
                    </h1>

                    <div className="space-y-2 font-space-mono text-[13px] text-black/75 tracking-[-0.2px]">
                        <div className="flex items-start gap-2">
                            <svg className="flex-shrink-0 mt-[1px] text-black/50" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span>{event.location}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <svg className="flex-shrink-0 mt-[1px] text-black/50" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>{when}</span>
                        </div>
                        {event.price && (
                            <div className="flex items-start gap-2">
                                <svg className="flex-shrink-0 mt-[1px] text-black/50" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="1" x2="12" y2="23" />
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                                <span>{event.price}</span>
                            </div>
                        )}
                    </div>

                    {hasDescription && (
                        <p className="mt-4 pt-4 border-t border-black/10 text-[14px] leading-relaxed text-black/80">
                            {event.description}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="mt-6 flex flex-col gap-3">
                        {event.url && (
                            <a
                                href={withReferral(event.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.ticketButton}
                            >
                                Event page &amp; tickets
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </a>
                        )}

                        <ShareButton
                            path={`/event/${event.id}`}
                            title={event.title}
                            text={`${event.title} — ${event.location}`}
                            label="Share this event"
                            className={styles.shareButton}
                        />

                        <Link
                            href="/"
                            className="flex items-center justify-center gap-1.5 w-full py-2 font-space-mono uppercase text-[12px] tracking-[-0.44px] text-black/55 hover:text-brand transition-colors"
                        >
                            See what else is on
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
