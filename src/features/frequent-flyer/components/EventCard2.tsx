'use client';

import { Event, formatEventDateTime } from '@/features/frequent-flyer/data/events';
import { hasRealImage } from '@/features/frequent-flyer/data/vibePlaceholders';
import GeneratedFlyer from './GeneratedFlyer';
import styles from './EventCard2.module.css';

interface EventCard2Props {
    event: Event;
    isActive?: boolean;
    onClick?: () => void;
    id?: string;
    /** Render the branded card even though a photo exists — used when the same
     *  picture already appeared earlier in this view. */
    forcePlaceholder?: boolean;
    /** How many dates this card stands in for (a collapsed series). */
    seriesDates?: number;
    /** Last date of the run, for the "through …" note. */
    seriesLastDate?: string;
    /** Narrow contexts (the picks strip) stack the stamp above the title and
     *  clamp it, so one long name can't make every card in the row tall. */
    compact?: boolean;
}

export default function EventCard2({
    event, isActive, onClick, id, forcePlaceholder = false, seriesDates = 1, seriesLastDate,
    compact = false,
}: EventCard2Props) {
    const showImage = hasRealImage(event.image) && !forcePlaceholder;
    const extraDates = Math.max(0, seriesDates - 1);
    const runsThrough = seriesLastDate
        ? new Date(`${seriesLastDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null;

    return (
        <div id={id} className={styles.card} onClick={onClick}>
            <div className={styles.imageContainer}>
                {showImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    /* The feed renders 130+ cards and used to request every
                       image on load — 229 requests when only ~22 are near the
                       viewport, roughly 64MB a page view, which burned 5GB of
                       Supabase egress in under two days.

                       Native lazy loading does NOT delay images already in or
                       near the viewport, so this is safe to apply to every
                       card: the ones you can see still load immediately.
                       Layout is already reserved by aspect-ratio on the
                       container, so nothing shifts as they arrive. */
                    <img
                        src={event.image}
                        alt={event.title}
                        className={styles.image}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <GeneratedFlyer title={event.title} vibe={event.vibe?.[0]} neighborhood={event.neighborhood} />
                )}
            </div>

            <div className={styles.content}>
                {/* The slot the fake 4.9 used to occupy, now carrying a claim
                    that's actually true: a human marked this one. Only
                    ff_curated gets it — 'promoted' is labelled on the flyer
                    instead, so paid placement never wears editorial clothes. */}
                {/* Compact stacks the stamp above the title: in a 200px card the
                    inline stamp took nearly half the width and pushed a long
                    name to six lines. Full width, clamped to two. */}
                {compact ? (
                    <>
                        {event.curationLevel === 'ff_curated' && (
                            <span className={`${styles.pick} ${styles.pickStacked}`} title="A Frequent Flyer pick">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                FF Pick
                            </span>
                        )}
                        <h3 className={`${styles.title} ${styles.titleClamped}`} title={event.title}>
                            {event.title}
                        </h3>
                    </>
                ) : (
                    <div className={styles.header}>
                        <h3 className={styles.title}>{event.title}</h3>
                        {event.curationLevel === 'ff_curated' && (
                            <span className={styles.pick} title="A Frequent Flyer pick">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                FF Pick
                            </span>
                        )}
                    </div>
                )}
                <div className={styles.info}>{event.location}</div>
                <div className={styles.info}>{formatEventDateTime(event.date, event.startTime, event.endTime)}</div>
                {/* One card stands in for a whole run, so say how long it runs
                    rather than printing 30 near-identical cards. */}
                {extraDates > 0 && (
                    <div className={styles.seriesNote}>
                        + {extraDates} more {extraDates === 1 ? 'date' : 'dates'}
                        {runsThrough ? ` through ${runsThrough}` : ''}
                    </div>
                )}
                {/* Only shown when the venue actually stated a price. This used
                    to read "Free entry" on every card — including $26 ticketed
                    shows — which sends people to a door expecting free. Silence
                    beats a confident wrong number. */}
                {event.price && (
                    <div className={styles.price}>
                        <span className={styles.priceValue}>{event.price}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
