'use client';

import { useEffect, useRef, useState } from 'react';
import { Event, formatEventDateTime } from '@/features/frequent-flyer/data/events';
import { hasRealImage } from '@/features/frequent-flyer/data/vibePlaceholders';
import GeneratedFlyer from './GeneratedFlyer';
import ShareButton from './ShareButton';
import styles from './EventDetailSheet.module.css';

interface EventDetailSheetProps {
    event: Event | null;
    onClose: () => void;
}

/**
 * Full-detail view for a single event. Bottom sheet on mobile (drag-handle
 * affordance), centered modal on desktop. Shows the full flyer, venue, date/
 * time, vibe, description, and an out-link to the event's own page / tickets
 * (source_url from the scout, falling back to the venue calendar).
 */
// Drag further than this (or flick faster) and the sheet dismisses.
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.55; // px per ms

export default function EventDetailSheet({ event, onClose }: EventDetailSheetProps) {
    // Drag-to-dismiss state for the mobile grab handle. The handle used to be
    // decorative, which read as broken — it advertises a gesture, so it has to
    // actually perform one.
    const [dragY, setDragY] = useState(0);
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef<{ y: number; t: number } | null>(null);

    const onPointerDown = (e: React.PointerEvent) => {
        dragStart.current = { y: e.clientY, t: Date.now() };
        setDragging(true);
    };

    // Track the gesture on the window rather than on the handle itself: the
    // handle is only ~40x26px, so a real drag leaves it almost immediately and
    // the element would stop receiving pointer events — freezing the sheet
    // mid-drag. (Pointer capture is unreliable here, so don't depend on it.)
    useEffect(() => {
        if (!dragging) return;

        const move = (e: PointerEvent) => {
            if (!dragStart.current) return;
            // Downward only — no rubber-banding the sheet above its stop.
            setDragY(Math.max(0, e.clientY - dragStart.current.y));
        };

        const end = (e: PointerEvent) => {
            const start = dragStart.current;
            dragStart.current = null;
            setDragging(false);
            setDragY(0);
            if (!start) return;
            const dy = Math.max(0, e.clientY - start.y);
            const velocity = dy / Math.max(1, Date.now() - start.t);
            if (dy > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) onClose();
        };

        window.addEventListener('pointermove', move, { passive: true });
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
        };
    }, [dragging, onClose]);

    // Reset drag offset whenever a different event opens the sheet.
    useEffect(() => {
        setDragY(0);
        setDragging(false);
        dragStart.current = null;
    }, [event]);

    useEffect(() => {
        if (!event) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        // Lock background scroll while open
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [event, onClose]);

    if (!event) return null;

    const showImage = hasRealImage(event.image);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={styles.sheet}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={event.title}
                style={dragY ? {
                    transform: `translateY(${dragY}px)`,
                    // No transition while the finger is down, so it tracks 1:1;
                    // springs back on release.
                    transition: dragging ? 'none' : undefined,
                } : undefined}
            >
                <div
                    className={styles.grabber}
                    onPointerDown={onPointerDown}
                    role="button"
                    tabIndex={0}
                    aria-label="Drag down to close"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}
                >
                    <div className={styles.grabberBar} />
                </div>

                <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className={styles.hero}>
                    {showImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={event.image} alt={event.title} className={styles.heroImage} />
                    ) : (
                        <GeneratedFlyer title={event.title} vibe={event.vibe?.[0]} neighborhood={event.neighborhood} />
                    )}
                </div>

                <div className={styles.body}>
                    {/* Pick stamp travels with the event: someone opening a
                        curated pick — or landing on a shared link to one —
                        should see that a human vouched for it. */}
                    {(event.vibe?.length || event.curationLevel === 'ff_curated') && (
                        <div className={styles.vibeRow}>
                            {event.curationLevel === 'ff_curated' && (
                                <span className={styles.pick}>★ FF Pick</span>
                            )}
                            {event.vibe?.map((v) => (
                                <span key={v} className="stamp text-[11px]">{v}</span>
                            ))}
                        </div>
                    )}

                    <h2 className={`${styles.title} font-space-grotesk`}>{event.title}</h2>

                    <div className={`${styles.metaRow} font-space-mono`}>
                        <svg className={styles.metaIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{event.location}</span>
                    </div>

                    <div className={`${styles.metaRow} font-space-mono`}>
                        <svg className={styles.metaIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>{formatEventDateTime(event.date, event.startTime, event.endTime)}</span>
                    </div>

                    {event.price && (
                        <div className={`${styles.metaRow} font-space-mono`}>
                            <svg className={styles.metaIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23" />
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                            <span>{event.price}</span>
                        </div>
                    )}

                    {event.description && event.description !== 'No description available' && (
                        <p className={styles.description}>{event.description}</p>
                    )}

                    {event.url && (
                        <a href={event.url} target="_blank" rel="noopener noreferrer" className={styles.linkButton}>
                            Event page &amp; tickets
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                        </a>
                    )}

                    {/* Share — only one-off events have a shareable /event/[id] page */}
                    {!event.id.startsWith('recurring-') && (
                        <ShareButton
                            path={`/event/${event.id}`}
                            title={event.title}
                            text={`${event.title} — ${event.location}`}
                            label="Share this event"
                            className={styles.shareButton}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
