'use client';

import { RecurringEvent, formatRecurringSchedule } from '@/features/frequent-flyer/data/recurringEvents';
import { RECURRING_CATEGORIES } from '@/features/frequent-flyer/data/recurringCategories';
import { hasRealImage } from '@/features/frequent-flyer/data/vibePlaceholders';
import SmartImage from '@/components/SmartImage';
import GeneratedFlyer from './GeneratedFlyer';
import styles from './EventCard2.module.css';

interface RecurringEventCardProps {
    event: RecurringEvent;
    onClick?: () => void;
    id?: string;
    /** Other weekdays folded into this card (a nightly happy hour is stored as
     *  one row per day, which rendered as seven identical cards). */
    extraDays?: number;
}

export default function RecurringEventCard({ event, onClick, id, extraDays = 0 }: RecurringEventCardProps) {
    const showImage = hasRealImage(event.venue_image);

    return (
        <div id={id} className={styles.card} onClick={onClick}>
            <div className={styles.imageContainer}>
                {showImage ? (
                    /* Shares EventCard2's stylesheet and grid slot, so it shares
                       the grid's measured sizes. */
                    <SmartImage
                        src={event.venue_image!}
                        alt={event.venue_name}
                        className={styles.image}
                        sizes="(max-width: 767px) 92vw, (max-width: 1100px) 45vw, (max-width: 1400px) 30vw, 22vw"
                    />
                ) : (
                    <GeneratedFlyer title={event.event_name} vibe={event.category} neighborhood={event.neighborhood} />
                )}
            </div>

            <div className={styles.content}>
                <div className={styles.header}>
                    <h3 className={styles.title}>{event.event_name}</h3>
                    <div className={styles.rating}>
                        <span style={{ fontSize: '0.8rem' }}>
                            {(RECURRING_CATEGORIES[event.category] || event.category).split(' ')[0]}
                        </span>
                    </div>
                </div>
                <div className={styles.info}>{event.venue_name}, {event.neighborhood}</div>
                <div className={styles.info}>
                    {formatRecurringSchedule(event.day_of_week, event.start_time, event.end_time)}
                </div>
                {extraDays > 0 && (
                    <div className={styles.seriesNote}>
                        + {extraDays} more {extraDays === 1 ? 'day' : 'days'}
                    </div>
                )}
                {event.description && (
                    <div className={styles.info} style={{ marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {event.description}
                    </div>
                )}
            </div>
        </div>
    );
}
