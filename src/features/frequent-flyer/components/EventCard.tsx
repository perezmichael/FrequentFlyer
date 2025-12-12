import { Event } from '@/features/frequent-flyer/data/events';
import styles from './EventCard.module.css';

interface EventCardProps {
    event: Event;
    isActive?: boolean;
    onClick?: () => void;
    id?: string;
}

export default function EventCard({ event, isActive, onClick, id }: EventCardProps) {
    return (
        <div id={id} className={styles.card} onClick={onClick}>
            <div className={styles.imageContainer}>
                <button className={styles.heartButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(0,0,0,0.5)" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.image} alt={event.title} className={styles.image} />
            </div>

            <div className={styles.content}>
                <div className={styles.header}>
                    <h3 className={styles.title}>{event.title}</h3>
                    <div className={styles.rating}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        <span>4.9</span>
                    </div>
                </div>

                <div className={styles.info}>{event.location}</div>
                <div className={styles.info}>{event.date}</div>

                <div className={styles.price}>
                    <span className={styles.priceValue}>Free</span>
                    <span style={{ fontWeight: 400 }}>entry</span>
                </div>

                {/* Optional Vibe Tags */}
                {/* <div className={styles.vibeTags}>
                    {event.vibe.slice(0, 2).map(v => (
                        <span key={v} className={styles.vibeTag}>{v}</span>
                    ))}
                </div> */}
            </div>
        </div>
    );
}
