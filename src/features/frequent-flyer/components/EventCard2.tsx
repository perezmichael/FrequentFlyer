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
}

export default function EventCard2({ event, isActive, onClick, id }: EventCard2Props) {
    const showImage = hasRealImage(event.image);

    return (
        <div id={id} className={styles.card} onClick={onClick}>
            <div className={styles.imageContainer}>
                <button className={styles.heartButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(0,0,0,0.5)" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
                {showImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={event.image} alt={event.title} className={styles.image} />
                ) : (
                    <GeneratedFlyer title={event.title} vibe={event.vibe?.[0]} neighborhood={event.neighborhood} />
                )}
            </div>

            <div className={styles.content}>
                {/* The slot the fake 4.9 used to occupy, now carrying a claim
                    that's actually true: a human marked this one. Only
                    ff_curated gets it — 'promoted' is labelled on the flyer
                    instead, so paid placement never wears editorial clothes. */}
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
                <div className={styles.info}>{event.location}</div>
                <div className={styles.info}>{formatEventDateTime(event.date, event.startTime, event.endTime)}</div>
                <div className={styles.price}>
                    <span className={styles.priceValue}>Free</span>
                    <span style={{ fontWeight: 400 }}>entry</span>
                </div>
            </div>
        </div>
    );
}
