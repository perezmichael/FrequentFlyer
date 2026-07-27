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
                {/* No rating here. It used to render a hardcoded 4.9 on every
                    card — invented data dressed as a trust signal, on an app
                    whose whole claim is human curation. (.rating still exists:
                    RecurringEventCard uses the slot for its category emoji.) */}
                <div className={styles.header}>
                    <h3 className={styles.title}>{event.title}</h3>
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
