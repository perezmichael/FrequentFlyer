'use client';

import { RecurringEvent, formatRecurringSchedule } from '@/features/frequent-flyer/data/recurringEvents';
import { RECURRING_CATEGORIES } from '@/features/frequent-flyer/data/recurringCategories';
import { hasRealImage, getVibePlaceholder } from '@/features/frequent-flyer/data/vibePlaceholders';
import styles from './EventCard2.module.css';

interface RecurringEventCardProps {
    event: RecurringEvent;
    onClick?: () => void;
    id?: string;
}

export default function RecurringEventCard({ event, onClick, id }: RecurringEventCardProps) {
    const showImage = hasRealImage(event.venue_image);
    const placeholder = getVibePlaceholder(event.category);

    return (
        <div id={id} className={styles.card} onClick={onClick}>
            <div className={styles.imageContainer}>
                {showImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={event.venue_image!} alt={event.venue_name} className={styles.image} />
                ) : (
                    <div className={styles.placeholder} style={{ background: placeholder.bg }}>
                        <span className={styles.placeholderEmoji}>{placeholder.emoji}</span>
                        <span className={styles.placeholderVibe}>{event.category}</span>
                        <span className={styles.placeholderNeighborhood}>{event.neighborhood}</span>
                    </div>
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
                {event.description && (
                    <div className={styles.info} style={{ marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {event.description}
                    </div>
                )}
            </div>
        </div>
    );
}
