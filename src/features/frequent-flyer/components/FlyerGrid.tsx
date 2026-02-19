import Image from 'next/image';
import { Event } from '@/features/frequent-flyer/data/events';
import styles from './FlyerGrid.module.css';

interface FlyerGridProps {
    events: Event[];
}

export default function FlyerGrid({ events }: FlyerGridProps) {
    return (
        <div className={styles.grid}>
            {events.map((event) => (
                <div key={event.id} className={styles.card}>
                    <div className={styles.imageWrapper}>
                        {event.image ? (
                            <Image
                                src={event.image}
                                alt={event.title}
                                fill
                                className={styles.image}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        ) : (
                            <div className={styles.placeholder} />
                        )}
                    </div>
                    {/* Optional: Overlay or details on hover? For now just the flyer as requested "only has flyers" */}
                </div>
            ))}
        </div>
    );
}
